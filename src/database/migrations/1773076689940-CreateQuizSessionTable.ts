import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateQuizSessionTable1773076689940 implements MigrationInterface {
    name = 'CreateQuizSessionTable1773076689940'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "quiz_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "maxQuestions" integer NOT NULL DEFAULT '10', "totalQuestions" integer NOT NULL DEFAULT '0', "correctAnswers" integer NOT NULL DEFAULT '0', "comboStreak" integer NOT NULL DEFAULT '0', "maxCombo" integer NOT NULL DEFAULT '0', "totalPoints" integer NOT NULL DEFAULT '0', "endedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_baecb665d6436ee3b31e7e165ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "quiz_session" ADD CONSTRAINT "FK_0f09252eb8ce25fc6ee8567447e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quiz_session" DROP CONSTRAINT "FK_0f09252eb8ce25fc6ee8567447e"`);
        await queryRunner.query(`DROP TABLE "quiz_session"`);
    }

}
