import { Injectable } from '@nestjs/common';
import { AlquranService } from '../alquran/alquran.service';
import { GeneratedQuestion, QuestionOption, Ayah } from '../common/interfaces/quran.interface';
import { generateChallenge } from '../common/utils/security.util'; 
import { SurahFilterDto } from './dto/surah-filter.dto';

const TOTAL_AYAHS = 6236;

@Injectable()
export class QuestionService {
  constructor(private readonly alquranService: AlquranService) {}

  private parseSurahFilter(surah?: string): SurahFilterDto | null  {
    if (!surah) return null;
    if (surah.includes(',')) {
      const numbers = surah.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n));
      if (numbers.length === 0) return null;
      return { kind: 'set', set: new Set(numbers) };
    }
    if (surah.includes('-')) {
      const [start, end] = surah.split('-').map(v => parseInt(v.trim(), 10));
      if (isNaN(start) || isNaN(end)) return null;
      return { kind: 'range', start: Math.min(start, end), end: Math.max(start, end) };
    }
    const surahId = parseInt(surah, 10);
    if (isNaN(surahId)) return null;
    return { kind: 'set', set: new Set([surahId]) };
  }

  async generateQuestion(juz?: number | number[], surah?: string, lang: 'id' | 'en' = 'id'): Promise<GeneratedQuestion> {
    let currentAyah: Ayah;
    let correctNext: Ayah;
    let potentialDistractors: Ayah[] = [];

    const juzList = Array.isArray(juz) ? juz : juz ? [juz] : [];
    const hasJuz = juzList.length > 0;
    const surahFilter = this.parseSurahFilter(surah) ?? null;

    if (hasJuz) {
      // Juz Mode: Fetch all ayahs in the Juz
      const juzAyahLists = await Promise.all(juzList.map(j => this.alquranService.fetchJuz(j)));
      const allJuzAyahs: Ayah[] = [];
      juzAyahLists.forEach(list => allJuzAyahs.push(...list));
      const juzAyahs = Array.from(new Map(allJuzAyahs.map(a => [a.number, a])).values());
      
      // Filter out:
      // 1. The very last ayah of the Quran (6236)
      // 2. The last ayah of any Surah (because there is no "next ayah" in the same surah context usually)
      let validStarts = juzAyahs.filter(a => {
          const isLastInQuran = a.number === TOTAL_AYAHS;
          const isLastInSurah = a.numberInSurah === a.surah.numberOfAyahs;
          return !isLastInQuran && !isLastInSurah;
      });

      // Apply Surah Filter if provided
      if (surahFilter) {
          if (surahFilter.kind === 'range') {
              validStarts = validStarts.filter(a => a.surah.number >= surahFilter.start && a.surah.number <= surahFilter.end);
              potentialDistractors = juzAyahs.filter(a => a.surah.number >= surahFilter.start && a.surah.number <= surahFilter.end);
          } else {
              validStarts = validStarts.filter(a => surahFilter.set.has(a.surah.number));
              potentialDistractors = juzAyahs.filter(a => surahFilter.set.has(a.surah.number));
          }
      } else {
          potentialDistractors = juzAyahs;
      }
      
      if (validStarts.length === 0) {
        // Fallback to global random if something is wrong with Juz data or filtering
        // This is highly unlikely unless a Juz only contains last ayahs (impossible)
        currentAyah = await this.alquranService.fetchRandomAyah();
      } else {
        const randomIdx = Math.floor(Math.random() * validStarts.length);
        currentAyah = validStarts[randomIdx];
      }

      correctNext = await this.alquranService.fetchNextAyah(currentAyah.number);
      // If we filtered distractors by surah, use that list, otherwise use whole Juz
      if (!potentialDistractors.length) potentialDistractors = juzAyahs;

    } else {
      // Global Mode
      // Keep fetching until we get one that isn't the last ayah of a surah
      let isValid = false;
      let attempts = 0;
      
      // Initial fetch
      currentAyah = await this.alquranService.fetchRandomAyah();
      
      while (!isValid && attempts < 50) {
          const isLastInQuran = currentAyah.number === TOTAL_AYAHS;
          const isLastInSurah = currentAyah.numberInSurah === currentAyah.surah.numberOfAyahs;
          const matchesSurah = !surahFilter
            ? true
            : surahFilter.kind === 'range'
              ? currentAyah.surah.number >= surahFilter.start && currentAyah.surah.number <= surahFilter.end
              : surahFilter.set.has(currentAyah.surah.number);
          
          if (!isLastInQuran && !isLastInSurah && matchesSurah) {
              isValid = true;
          } else {
              attempts++;
              currentAyah = await this.alquranService.fetchRandomAyah();
          }
      }

      correctNext = await this.alquranService.fetchNextAyah(currentAyah.number);
    }

    // Fetch audio and translation for the current question ayah
    const { audio, translation } = await this.alquranService.fetchAyahDetails(currentAyah.number, lang);

    // 3. Generate 3 distractors
    const options: any[] = [];
    
    // Start with the correct answer
    options.push({
      id: correctNext.number,
      text: correctNext.text,
      surah: correctNext.surah.number,
      ayah: correctNext.numberInSurah
    });

    const usedIds = new Set<number>([currentAyah.number, correctNext.number]);

    // Fill with distractors
    let attempts = 0;
    while (options.length < 4 && attempts < 50) {
      attempts++;
      
      let distractor: Ayah | null = null;

      if (hasJuz && potentialDistractors.length > 0) {
          // Pick random from same Juz
          const randomIdx = Math.floor(Math.random() * potentialDistractors.length);
          const candidate = potentialDistractors[randomIdx];
          if (!usedIds.has(candidate.number)) {
              distractor = candidate;
          }
      } else {
          // Pick random global
          const randomId = Math.floor(Math.random() * TOTAL_AYAHS) + 1;
          if (!usedIds.has(randomId)) {
              try {
                  distractor = await this.alquranService.fetchAyahByGlobalNumber(randomId);
              } catch (e) {
                  // Ignore fetch errors
              }
          }
      }

      if (distractor) {
          // Safety check for identical text
          if (distractor.text === correctNext.text) continue;

          options.push({
              id: distractor.number,
              text: distractor.text,
              surah: distractor.surah.number,
              ayah: distractor.numberInSurah
          });
          usedIds.add(distractor.number);
      }
    }

    // 4. Shuffle options (Fisher-Yates) and Assign Keys
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    // Create obfuscated keys and choice map
    const choiceMap: Record<string, number> = {};
    const obfuscatedOptions: QuestionOption[] = options.map((opt, index) => {
      const key = `opt_${index + 1}`;
      choiceMap[key] = opt.id;
      return {
        key,
        text: opt.text,
        surah: opt.surah,
        ayah: opt.ayah
      };
    });

    const challengeToken = generateChallenge(correctNext.number, currentAyah.number, choiceMap);

    return {
      currentAyah: {
        text: currentAyah.text,
        surah: currentAyah.surah.number,
        surahName: currentAyah.surah.englishName,
        surahEnglishName: currentAyah.surah.englishName,
        ayah: currentAyah.numberInSurah,
        audio,
        translation
      },
      correctAyahId: correctNext.number,
      options: obfuscatedOptions,
      challengeToken
    };
  }
}