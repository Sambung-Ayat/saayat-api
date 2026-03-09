import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  surah: {
    number: number;
    name: string;
    englishName: string;
    numberOfAyahs: number;
  };
}

@Injectable()
export class QuranService {
  private readonly ayahCache = new Map<number, Ayah>();
  private readonly BASE_URL = 'https://api.alquran.cloud/v1';
  private readonly EDITION = 'quran-uthmani';
  private readonly TOTAL_AYAHS = 6236;

  async fetchAyahByGlobalNumber(number: number): Promise<Ayah> {
    if (this.ayahCache.has(number)) return this.ayahCache.get(number)!;

    const data = await this.fetchWithRetry(
      `${this.BASE_URL}/ayah/${number}/${this.EDITION}`,
    );
    const response = await data.json();

    if (response.code !== 200 || !response.data) {
      throw new ServiceUnavailableException(`Failed to fetch ayah ${number}`);
    }

    this.ayahCache.set(number, response.data);
    return response.data;
  }

  async fetchRandomAyah(): Promise<Ayah> {
    const randomNum = Math.floor(Math.random() * (this.TOTAL_AYAHS - 1)) + 1;
    return this.fetchAyahByGlobalNumber(randomNum);
  }

  async fetchNextAyah(currentGlobalNumber: number): Promise<Ayah> {
    if (currentGlobalNumber >= this.TOTAL_AYAHS) {
      throw new ServiceUnavailableException(
        'No next ayah available (end of Quran)',
      );
    }
    return this.fetchAyahByGlobalNumber(currentGlobalNumber + 1);
  }

  async fetchJuz(juzNumber: number): Promise<Ayah[]> {
    if (juzNumber < 1 || juzNumber > 30) {
      throw new ServiceUnavailableException(
        'Juz number must be between 1 and 30',
      );
    }

    const data = await this.fetchWithRetry(
      `${this.BASE_URL}/juz/${juzNumber}/${this.EDITION}`,
    );
    const response = await data.json();

    if (response.code !== 200 || !response.data) {
      throw new ServiceUnavailableException(`Failed to fetch Juz ${juzNumber}`);
    }

    response.data.ayahs.forEach((ayah: Ayah) =>
      this.ayahCache.set(ayah.number, ayah),
    );
    return response.data.ayahs;
  }

  async fetchAyahDetails(
    number: number,
    lang: 'id' | 'en' = 'id',
  ): Promise<{ audio: string; translation: string }> {
    const translationEdition = lang === 'en' ? 'en.sahih' : 'id.indonesian';
    const url = `${this.BASE_URL}/ayah/${number}/editions/ar.alafasy,${translationEdition}`;

    try {
      const data = await this.fetchWithRetry(url);
      const response = await data.json();

      if (response.code !== 200 || !response.data)
        return { audio: '', translation: '' };

      const audioData = response.data.find(
        (i: any) => i.edition?.identifier === 'ar.alafasy',
      );
      const translationData = response.data.find(
        (i: any) => i.edition?.identifier === translationEdition,
      );

      return {
        audio: audioData?.audio || '',
        translation: translationData?.text || '',
      };
    } catch {
      return { audio: '', translation: '' };
    }
  }

  private async fetchWithRetry(
    url: string,
    retries = 1,
    timeoutMs = 5000,
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (retries > 0) return this.fetchWithRetry(url, retries - 1, timeoutMs);
      throw error;
    }
  }
}
