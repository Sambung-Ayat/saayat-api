import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAnonymousToUser1773495674204 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isAnonymous"`);
  }
}
