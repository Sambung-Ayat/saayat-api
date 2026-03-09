import { Injectable } from '@nestjs/common';
import { QuranService, Ayah } from '@/quran/quran.service';
import { generateChallenge } from '@/common/utils/security.util';

export interface QuestionOption {
  key: string;
  text: string;
  surah: number;
  ayah: number;
}

export interface GeneratedQuestion {
  currentAyah: {
    text: string;
    surah: number;
    surahName: string;
    surahEnglishName: string;
    ayah: number;
    audio: string;
    translation: string;
  };
  options: QuestionOption[];
  challengeToken: string;
}

type SurahFilter =
  | { kind: 'range'; start: number; end: number }
  | { kind: 'set'; set: Set<number> };

@Injectable()
export class QuestionService {
  private readonly TOTAL_AYAHS = 6236;

  constructor(private readonly quranService: QuranService) {}

  async generateQuestion(
    juz?: number | number[],
    surah?: string,
    lang: 'id' | 'en' = 'id',
  ): Promise<GeneratedQuestion> {
    let currentAyah: Ayah;
    let correctNext: Ayah;
    let potentialDistractors: Ayah[] = [];

    const juzList = Array.isArray(juz) ? juz : juz ? [juz] : [];
    const hasJuz = juzList.length > 0;
    const surahFilter = this.parseSurahFilter(surah);

    if (hasJuz) {
      const juzAyahLists = await Promise.all(
        juzList.map((j) => this.quranService.fetchJuz(j)),
      );
      const allJuzAyahs: Ayah[] = [];
      juzAyahLists.forEach((list) => allJuzAyahs.push(...list));
      const juzAyahs = Array.from(
        new Map(allJuzAyahs.map((a) => [a.number, a])).values(),
      );

      let validStarts = juzAyahs.filter(
        (a) =>
          a.number !== this.TOTAL_AYAHS &&
          a.numberInSurah !== a.surah.numberOfAyahs,
      );

      if (surahFilter) {
        validStarts = this.applyFilter(validStarts, surahFilter);
        potentialDistractors = this.applyFilter(juzAyahs, surahFilter);
      } else {
        potentialDistractors = juzAyahs;
      }

      if (validStarts.length === 0) {
        currentAyah = await this.quranService.fetchRandomAyah();
      } else {
        currentAyah =
          validStarts[Math.floor(Math.random() * validStarts.length)];
      }

      correctNext = await this.quranService.fetchNextAyah(currentAyah.number);
      if (!potentialDistractors.length) potentialDistractors = juzAyahs;
    } else {
      // Global mode
      let isValid = false;
      let attempts = 0;

      currentAyah = await this.quranService.fetchRandomAyah();

      while (!isValid && attempts < 50) {
        const isLastInQuran = currentAyah.number === this.TOTAL_AYAHS;
        const isLastInSurah =
          currentAyah.numberInSurah === currentAyah.surah.numberOfAyahs;
        const matchesSurah =
          !surahFilter || this.matchesFilter(currentAyah, surahFilter);

        if (!isLastInQuran && !isLastInSurah && matchesSurah) {
          isValid = true;
        } else {
          currentAyah = await this.quranService.fetchRandomAyah();
          attempts++;
        }
      }

      correctNext = await this.quranService.fetchNextAyah(currentAyah.number);
    }

    const { audio, translation } = await this.quranService.fetchAyahDetails(
      currentAyah.number,
      lang,
    );

    // Build options
    const options: any[] = [
      {
        id: correctNext.number,
        text: correctNext.text,
        surah: correctNext.surah.number,
        ayah: correctNext.numberInSurah,
      },
    ];

    const usedIds = new Set<number>([currentAyah.number, correctNext.number]);
    let attempts = 0;

    while (options.length < 4 && attempts < 50) {
      attempts++;
      let distractor: Ayah | null = null;

      if (hasJuz && potentialDistractors.length > 0) {
        const candidate =
          potentialDistractors[
            Math.floor(Math.random() * potentialDistractors.length)
          ];
        if (!usedIds.has(candidate.number)) distractor = candidate;
      } else {
        const randomId = Math.floor(Math.random() * this.TOTAL_AYAHS) + 1;
        if (!usedIds.has(randomId)) {
          try {
            distractor =
              await this.quranService.fetchAyahByGlobalNumber(randomId);
          } catch {}
        }
      }

      if (distractor && distractor.text !== correctNext.text) {
        options.push({
          id: distractor.number,
          text: distractor.text,
          surah: distractor.surah.number,
          ayah: distractor.numberInSurah,
        });
        usedIds.add(distractor.number);
      }
    }

    // Fisher-Yates shuffle
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    // Assign obfuscated keys
    const choiceMap: Record<string, number> = {};
    const obfuscatedOptions: QuestionOption[] = options.map((opt, idx) => {
      const key = `opt_${idx + 1}`;
      choiceMap[key] = opt.id;
      return { key, text: opt.text, surah: opt.surah, ayah: opt.ayah };
    });

    const challengeToken = generateChallenge(
      correctNext.number,
      currentAyah.number,
      choiceMap,
    );

    return {
      currentAyah: {
        text: currentAyah.text,
        surah: currentAyah.surah.number,
        surahName: currentAyah.surah.name,
        surahEnglishName: currentAyah.surah.englishName,
        ayah: currentAyah.numberInSurah,
        audio,
        translation,
      },
      options: obfuscatedOptions,
      challengeToken,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private parseSurahFilter(surah?: string): SurahFilter | null {
    if (!surah) return null;

    if (surah.includes(',')) {
      const numbers = surah
        .split(',')
        .map((v) => parseInt(v.trim(), 10))
        .filter((n) => !isNaN(n));
      return numbers.length ? { kind: 'set', set: new Set(numbers) } : null;
    }

    if (surah.includes('-')) {
      const [start, end] = surah.split('-').map((v) => parseInt(v.trim(), 10));
      if (isNaN(start) || isNaN(end)) return null;
      return {
        kind: 'range',
        start: Math.min(start, end),
        end: Math.max(start, end),
      };
    }

    const surahId = parseInt(surah, 10);
    return isNaN(surahId) ? null : { kind: 'set', set: new Set([surahId]) };
  }

  private applyFilter(ayahs: Ayah[], filter: SurahFilter): Ayah[] {
    return ayahs.filter((a) => this.matchesFilter(a, filter));
  }

  private matchesFilter(ayah: Ayah, filter: SurahFilter): boolean {
    if (filter.kind === 'range')
      return (
        ayah.surah.number >= filter.start && ayah.surah.number <= filter.end
      );
    return filter.set.has(ayah.surah.number);
  }
}
