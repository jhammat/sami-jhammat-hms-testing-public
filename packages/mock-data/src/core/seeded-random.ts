export interface SeededRandom {
  next(): number;

  integer(
    minimum: number,
    maximum: number,
  ): number;

  boolean(
    probability?: number,
  ): boolean;

  pick<T>(
    values: readonly T[],
  ): T;

  shuffle<T>(
    values: readonly T[],
  ): T[];
}

function hashSeed(
  seed: string,
): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);

    hash = Math.imul(
      hash,
      16_777_619,
    );
  }

  return hash >>> 0;
}

function createMulberry32(
  initialSeed: number,
): () => number {
  let state = initialSeed;

  return () => {
    state += 0x6d2b79f5;

    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1,
    );

    value ^= value + Math.imul(
      value ^ (value >>> 7),
      value | 61,
    );

    return (
      (
        value ^
        (value >>> 14)
      ) >>> 0
    ) / 4_294_967_296;
  };
}

export function createSeededRandom(
  seed: string,
): SeededRandom {
  const nextValue = createMulberry32(
    hashSeed(seed),
  );

  return {
    next(): number {
      return nextValue();
    },

    integer(
      minimum: number,
      maximum: number,
    ): number {
      if (
        !Number.isInteger(minimum) ||
        !Number.isInteger(maximum)
      ) {
        throw new Error(
          "Seeded integer bounds must be whole numbers.",
        );
      }

      if (maximum < minimum) {
        throw new Error(
          "The maximum cannot be lower than the minimum.",
        );
      }

      const range =
        maximum - minimum + 1;

      return (
        minimum +
        Math.floor(nextValue() * range)
      );
    },

    boolean(
      probability = 0.5,
    ): boolean {
      if (
        probability < 0 ||
        probability > 1
      ) {
        throw new Error(
          "Probability must be between zero and one.",
        );
      }

      return nextValue() < probability;
    },

    pick<T>(
      values: readonly T[],
    ): T {
      if (values.length === 0) {
        throw new Error(
          "Cannot select from an empty collection.",
        );
      }

      const selectedIndex =
        Math.floor(
          nextValue() * values.length,
        );

      const selectedValue =
        values[selectedIndex];

      if (selectedValue === undefined) {
        throw new Error(
          "Unable to select a deterministic value.",
        );
      }

      return selectedValue;
    },

    shuffle<T>(
      values: readonly T[],
    ): T[] {
      const result = [...values];

      for (
        let currentIndex = result.length - 1;
        currentIndex > 0;
        currentIndex -= 1
      ) {
        const replacementIndex =
          Math.floor(
            nextValue() *
            (currentIndex + 1),
          );

        const currentValue =
          result[currentIndex];

        const replacementValue =
          result[replacementIndex];

        if (
          currentValue === undefined ||
          replacementValue === undefined
        ) {
          continue;
        }

        result[currentIndex] =
          replacementValue;

        result[replacementIndex] =
          currentValue;
      }

      return result;
    },
  };
}