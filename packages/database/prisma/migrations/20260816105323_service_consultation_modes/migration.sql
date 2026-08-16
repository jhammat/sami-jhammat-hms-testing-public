-- A service may now support more than one consultation mode at a location
-- (in-person only, online only, or both). Replaces the single-value
-- "consultationMode" column with an array, seeded from the existing value
-- so no service loses its current mode.
ALTER TABLE "public"."ServiceDefinition" ADD COLUMN "consultationModes" "public"."ConsultationMode"[] NOT NULL DEFAULT ARRAY['IN_PERSON']::"public"."ConsultationMode"[];

UPDATE "public"."ServiceDefinition" SET "consultationModes" = ARRAY["consultationMode"];

ALTER TABLE "public"."ServiceDefinition" DROP COLUMN "consultationMode";

ALTER TABLE "public"."ServiceDefinition" ADD CONSTRAINT "ServiceDefinition_consultationModes_not_empty" CHECK (cardinality("consultationModes") > 0);
