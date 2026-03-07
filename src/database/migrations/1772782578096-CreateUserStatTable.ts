import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserStatTable1772782578096 implements MigrationInterface {
    name = 'CreateUserStatTable1772782578096'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_stat" ("userId" uuid NOT NULL, "totalCorrect" integer NOT NULL DEFAULT '0', "totalAttempted" integer NOT NULL DEFAULT '0', "currentStreak" integer NOT NULL DEFAULT '0', "longestStreak" integer NOT NULL DEFAULT '0', "currentCorrectStreak" integer NOT NULL DEFAULT '0', "longestCorrectStreak" integer NOT NULL DEFAULT '0', "totalPoints" integer NOT NULL DEFAULT '0', "lastActiveAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_711f33b7c83e2b58777eabadf1e" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`ALTER TABLE "user_stat" ADD CONSTRAINT "FK_711f33b7c83e2b58777eabadf1e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_stat" DROP CONSTRAINT "FK_711f33b7c83e2b58777eabadf1e"`);
        await queryRunner.query(`DROP TABLE "user_stat"`);
    }

}
