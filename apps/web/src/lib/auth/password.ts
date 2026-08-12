import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

interface ScryptParameters {
  cost: number;
  blockSize: number;
  parallelization: number;
  keyLength: number;
}

const PARAMETERS:
  ScryptParameters = {
    cost: 16_384,
    blockSize: 8,
    parallelization: 1,
    keyLength: 64,
  };

const SALT_LENGTH_BYTES = 16;

function deriveKey(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters,
): Promise<Buffer> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      scryptCallback(
        password,
        salt,
        parameters.keyLength,
        {
          N: parameters.cost,
          r: parameters.blockSize,
          p: parameters.parallelization,
          maxmem:
            128 *
            parameters.cost *
            parameters.blockSize *
            2,
        },
        (
          error,
          derivedKey,
        ) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(
            derivedKey as Buffer,
          );
        },
      );
    },
  );
}

export async function hashPassword(
  password: string,
): Promise<string> {
  validateNewPassword(password);
  const salt =
    randomBytes(
      SALT_LENGTH_BYTES,
    );

  const derivedKey =
    await deriveKey(
      password,
      salt,
      PARAMETERS,
    );

  return [
    "scrypt",
    PARAMETERS.cost,
    PARAMETERS.blockSize,
    PARAMETERS.parallelization,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
}

export function validateNewPassword(password: string): void {
  if (password.length < 12) {
    throw new Error("Password must contain at least 12 characters.");
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Password must contain uppercase, lowercase and numeric characters.");
  }
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const segments =
    storedHash.split("$");

  if (
    segments.length !== 6 ||
    segments[0] !== "scrypt"
  ) {
    return false;
  }

  const [
    ,
    costText,
    blockSizeText,
    parallelizationText,
    saltHex,
    derivedKeyHex,
  ] = segments;

  const parameters: ScryptParameters = {
    cost: Number(costText),
    blockSize: Number(blockSizeText),
    parallelization: Number(
      parallelizationText,
    ),
    keyLength:
      derivedKeyHex!.length / 2,
  };

  if (
    !Number.isFinite(parameters.cost) ||
    !Number.isFinite(
      parameters.blockSize,
    ) ||
    !Number.isFinite(
      parameters.parallelization,
    ) ||
    !Number.isFinite(
      parameters.keyLength,
    )
  ) {
    return false;
  }

  const salt = Buffer.from(
    saltHex!,
    "hex",
  );

  const expectedKey = Buffer.from(
    derivedKeyHex!,
    "hex",
  );

  const candidateKey =
    await deriveKey(
      password,
      salt,
      parameters,
    );

  if (
    candidateKey.length !==
    expectedKey.length
  ) {
    return false;
  }

  return timingSafeEqual(
    candidateKey,
    expectedKey,
  );
}
