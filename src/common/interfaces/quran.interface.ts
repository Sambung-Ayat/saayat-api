export interface AlQuranResponse<T> {
  code: number;
  status: string;
  data: T;
}

export interface Ayah {
  number: number; // Global number (1-6236)
  text: string;
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: string;
  };
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
  audio?: string;
  translation?: string;
}

export interface QuestionOption {
  key: string; // Obfuscated key (e.g., 'opt_1')
  text: string;
  surah: number;
  ayah: number;
}

export interface Question {
  currentAyah: {
    // Hidden global ID from public type
    text: string;
    surah: number;
    surahName?: string;
    surahEnglishName?: string;
    ayah: number;
    audio?: string;
    translation?: string;
  };
  options: QuestionOption[];
  challengeToken: string;
}

// Internal type for generator before sanitizing for frontend
export interface GeneratedQuestion extends Question {
  correctAyahId: number;
}

export interface ValidationResponse {
  isCorrect: boolean;
  currentStreak?: number;
  longestStreak?: number;
  currentCorrectStreak?: number;
  
  comboStreak?: number;
  pointsGained?: number;
  totalPoints?: number;
  remainingQuestions?: number;
  sessionFinished?: boolean;

  correctAyah?: {
    id: number;
    text: string;
    surah: number;
    ayah: number;
  };
}
