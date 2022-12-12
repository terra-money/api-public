function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

function average(values: number[]) {
  return sum(values) / values.length;
}

function stdDev(values: number[]) {
  const avg = average(values);
  const variance = sum(values.map((v) => Math.pow(v - avg, 2))) / values.length;
  return Math.sqrt(variance);
}

export function createStandardDeviationScoreMapper() {
  const values: number[] = [];
  let finalized = false;

  let min: number, max: number, avg: number;

  function appendValue(value: number) {
    if (Number.isNaN(value)) return;
    if (finalized) throw new Error('already finalized');
    values.push(value);
  }

  function finalize() {
    finalized = true;

    const sd = stdDev(values);

    avg = average(values);
    min = avg - 2.33 * sd;
    max = Math.min(1, avg + 2.33 * sd);
  }

  function mapToScore(rawScore?: number | string): number {
    if (!finalized) throw new Error('not finalized');
    if (rawScore === undefined) return 0;
    if (Number.isNaN(rawScore)) return avg;

    const result = ((+rawScore - min) * 100) / (max - min);
    if (Number.isNaN(result)) return 0;
    return result;
  }

  return {
    appendValue,
    finalize,
    mapToScore,
  };
}

export function createMajorityPenaltyMapper() {
  const values: number[] = [];
  let finalized = false;

  let min: number, max: number;

  function appendValue(value: number) {
    if (Number.isNaN(value)) return;
    if (finalized) throw new Error('already finalized');
    values.push(value);
  }

  function finalize() {
    finalized = true;

    //33%
    const totalShare = sum(values);

    const majority: number[] = [];
    const sorted = values.sort((a, b) => b - a);
    let cumulative = 0;
    for (const v of sorted) {
      cumulative += v;

      majority.push(v);
      if (cumulative * 3 >= totalShare) {
        break;
      }
    }

    min = Math.min(...majority);
    max = Math.max(...values);
  }

  function mapToScore(rawScore?: number | string): number {
    if (!finalized) throw new Error('not finalized');
    if (rawScore === undefined) return 0;
    const result = ((Math.max(+rawScore, min) - min) * 100) / (max - min);
    if (Number.isNaN(result)) return 0;
    return result;
  }

  return {
    appendValue,
    finalize,
    mapToScore,
  };
}
