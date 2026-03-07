import { Injectable } from '@nestjs/common';
import { AlquranService } from '../alquran/alquran.service'; 
import { SurahData } from './interfaces/surah-data.interface';

@Injectable()
export class SurahsService {
  private readonly juzSurahCache = new Map<number, SurahData[]>();

  constructor(private readonly alquranService: AlquranService) {}

  async getSurahsByJuz(juzNumbers: number[]): Promise<SurahData[]> {
    const combinedSurahs = new Map<number, SurahData>();

    for (const juz of juzNumbers) {
      let surahsForJuz = this.juzSurahCache.get(juz);
      
      if (!surahsForJuz) {
        const ayahs = await this.alquranService.fetchJuz(juz);

        const surahMap = new Map<number, SurahData>();
        ayahs.forEach(ayah => {
          if (!surahMap.has(ayah.surah.number)) {
            surahMap.set(ayah.surah.number, {
              id: ayah.surah.number,
              name: ayah.surah.name,
              englishName: ayah.surah.englishName,
            });
          }
        });

        surahsForJuz = Array.from(surahMap.values()).sort((a, b) => a.id - b.id);
        this.juzSurahCache.set(juz, surahsForJuz);
      }

      surahsForJuz.forEach(surah => {
        if (!combinedSurahs.has(surah.id)) combinedSurahs.set(surah.id, surah);
      });
    }

    return Array.from(combinedSurahs.values()).sort((a, b) => a.id - b.id);
  }
}