-- Lets a patient's uploaded profile photo be served back with its real
-- content type instead of a guess -- photoObjectKey alone doesn't carry
-- that information.
ALTER TABLE "Patient" ADD COLUMN     "photoContentType" VARCHAR(100);
