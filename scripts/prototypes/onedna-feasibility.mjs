/**
 * OneDna design-phase feasibility prototype — NOT production code.
 *
 * Exists so the design documents in docs/ can make verified claims instead of
 * hopeful ones. It sweeps a matrix of candidate rule systems and reports, for
 * each: whether puzzles come out uniquely solvable by logic alone, how many
 * clues that needs, how many cells the player is then left to fill, and which
 * human techniques actually carry the solve.
 *
 * The three numbers that decide the design are:
 *   - unique + logic-only  ... must be 100%
 *   - cells to fill        ... the real proxy for session length
 *   - technique mix        ... a system carried entirely by tier 1 is a grind
 *
 * Nothing here ships. The production solver and generator described in
 * docs/onedna-generator-design.md are a TypeScript rewrite of these ideas.
 *
 *   node scripts/prototypes/onedna-feasibility.mjs [seed] [samples]
 *
 * Base encoding — chosen so the two structural questions are bit operations:
 *   0 = A, 1 = T, 2 = C, 3 = G
 *   complement(b) = b ^ 1      (A<->T, C<->G)
 *   family(b)     = b >> 1     (0 = the A/T pair, 1 = the C/G pair)
 */

const LETTERS = ["A", "T", "C", "G"];
const ALL = 0b1111;
const FAMILY_MASK = [0b0011, 0b1100];

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const POPCOUNT = Array.from({ length: 16 }, (_, mask) =>
  [0, 1, 2, 3].reduce((total, bit) => total + ((mask >> bit) & 1), 0),
);

const COMPLEMENT_MASK = Array.from({ length: 16 }, (_, mask) => {
  let out = 0;
  for (let b = 0; b < 4; b += 1) if (mask & (1 << b)) out |= 1 << (b ^ 1);
  return out;
});

const soleBase = (mask) => 31 - Math.clz32(mask & -mask);

/* ========================================================================== */
/* Rule systems under test                                                    */
/* ========================================================================== */

/**
 * A composition mode gives every line a budget: how many cells each pair family
 * may claim, and the min/max each individual base may claim.
 *
 *   exact      each base exactly n/4 times            (needs n divisible by 4)
 *   familyAll  half each family, and no base 3+ times (any even n; at n=6 this
 *              is the same as "all four bases appear")
 *   family     half each family, bases unrestricted   (any even n)
 */
function budget(mode, n) {
  const half = n / 2;
  if (mode === "exact") {
    const k = n / 4;
    return { family: half, min: [k, k, k, k], max: [k, k, k, k] };
  }
  if (mode === "familyAll") {
    return { family: half, min: [1, 1, 1, 1], max: [half - 1, half - 1, half - 1, half - 1] };
  }
  return { family: half, min: [0, 0, 0, 0], max: [half, half, half, half] };
}

/* ========================================================================== */
/* Board geometry                                                             */
/* ========================================================================== */

function geometry(n) {
  const lines = [];
  for (let r = 0; r < n; r += 1) lines.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c += 1) lines.push(Array.from({ length: n }, (_, r) => r * n + c));
  const neighbours = Array.from({ length: n * n }, (_, i) => {
    const r = Math.floor(i / n);
    const c = i % n;
    const out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  });
  const linesOf = Array.from({ length: n * n }, (_, i) => [Math.floor(i / n), n + (i % n)]);
  const offsetIn = Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)]);
  return { n, cells: n * n, lines, neighbours, linesOf, offsetIn };
}

/* ========================================================================== */
/* 1. Solution generation                                                     */
/* ========================================================================== */

function generateSolution(geo, rules, random) {
  const { n } = geo;
  const bud = rules.budget;
  const grid = new Int8Array(n * n).fill(-1);
  const colBase = Array.from({ length: n }, () => [0, 0, 0, 0]);
  const colFamily = Array.from({ length: n }, () => [0, 0]);
  let steps = 0;

  const fillRow = (r) => {
    if (r === n) return true;
    const rowBase = [0, 0, 0, 0];
    const rowFamily = [0, 0];

    const place = (c) => {
      if (steps++ > 600_000) return false;
      if (c === n) {
        // Every base must still be able to hit its minimum in this row.
        for (let b = 0; b < 4; b += 1) if (rowBase[b] < bud.min[b]) return false;
        return fillRow(r + 1);
      }
      const i = r * n + c;
      for (const b of shuffled([0, 1, 2, 3], random)) {
        const f = b >> 1;
        if (rowBase[b] === bud.max[b] || colBase[c][b] === bud.max[b]) continue;
        if (rowFamily[f] === bud.family || colFamily[c][f] === bud.family) continue;
        if (rules.adjacency && c > 0 && grid[i - 1] === b) continue;
        if (rules.adjacency && r > 0 && grid[i - n] === b) continue;
        grid[i] = b;
        rowBase[b] += 1;
        rowFamily[f] += 1;
        colBase[c][b] += 1;
        colFamily[c][f] += 1;
        if (place(c + 1)) return true;
        grid[i] = -1;
        rowBase[b] -= 1;
        rowFamily[f] -= 1;
        colBase[c][b] -= 1;
        colFamily[c][f] -= 1;
      }
      return false;
    };

    return place(0);
  };

  if (!fillRow(0)) return null;
  // Columns only had their maxima enforced during search; confirm the minima.
  for (let c = 0; c < n; c += 1) {
    for (let b = 0; b < 4; b += 1) if (colBase[c][b] < bud.min[b]) return null;
  }
  return grid;
}

/* ========================================================================== */
/* 2. Bonds                                                                   */
/* ========================================================================== */

function pickBonds(geo, solution, count, random) {
  const { n, cells } = geo;
  const used = new Uint8Array(cells);
  const bonds = [];

  for (const i of shuffled([...Array(cells).keys()], random)) {
    if (bonds.length >= count) break;
    if (used[i]) continue;
    const want = solution[i] ^ 1;
    const partners = [];
    for (let j = 0; j < cells; j += 1) {
      if (j === i || used[j] || solution[j] !== want) continue;
      const dr = Math.abs(Math.floor(i / n) - Math.floor(j / n));
      const dc = Math.abs((i % n) - (j % n));
      if (dr + dc >= 2) partners.push(j);
    }
    if (!partners.length) continue;
    const j = partners[Math.floor(random() * partners.length)];
    used[i] = 1;
    used[j] = 1;
    bonds.push([Math.min(i, j), Math.max(i, j)]);
  }
  return bonds;
}

/* ========================================================================== */
/* 3. Human-style logical solver                                              */
/* ========================================================================== */

const TECHNIQUES = {
  "naked-single": { tier: 1, weight: 1 },
  "neighbour-exclusion": { tier: 1, weight: 1 },
  "bond-complement": { tier: 1, weight: 1 },
  "family-saturation": { tier: 1, weight: 2 },
  "count-saturation": { tier: 1, weight: 2 },
  "family-completion": { tier: 2, weight: 3 },
  "count-completion": { tier: 2, weight: 3 },
  "bond-narrowing": { tier: 2, weight: 4 },
  "naked-subset": { tier: 3, weight: 7 },
  "spacing-squeeze": { tier: 3, weight: 9 },
};

function createState(geo, rules, givens, bonds) {
  const { cells, lines, linesOf } = geo;
  const state = {
    geo,
    rules,
    cand: new Int8Array(cells).fill(ALL),
    value: new Int8Array(cells).fill(-1),
    base: new Int8Array(lines.length * 4),
    family: new Int8Array(lines.length * 2),
    partner: new Int16Array(cells).fill(-1),
    bonds,
    path: [],
    counts: {},
    contradiction: false,
  };
  for (const [i, j] of bonds) {
    state.partner[i] = j;
    state.partner[j] = i;
  }
  for (let i = 0; i < cells; i += 1) {
    if (givens[i] < 0) continue;
    const b = givens[i];
    state.cand[i] = 1 << b;
    state.value[i] = b;
    for (const line of linesOf[i]) {
      state.base[line * 4 + b] += 1;
      state.family[line * 2 + (b >> 1)] += 1;
    }
  }
  return state;
}

function trim(state, i, mask, technique, detail) {
  const next = state.cand[i] & mask;
  if (next === state.cand[i]) return false;
  if (next === 0) {
    state.contradiction = true;
    return true;
  }
  state.cand[i] = next;
  state.path.push({ technique, cell: i, ...detail });
  state.counts[technique] = (state.counts[technique] ?? 0) + 1;

  if (POPCOUNT[next] === 1 && state.value[i] < 0) {
    const b = soleBase(next);
    state.value[i] = b;
    for (const line of state.geo.linesOf[i]) {
      state.base[line * 4 + b] += 1;
      state.family[line * 2 + (b >> 1)] += 1;
    }
    state.path.push({ technique: "naked-single", cell: i, value: b });
    state.counts["naked-single"] = (state.counts["naked-single"] ?? 0) + 1;
  }
  return true;
}

function tierOne(state) {
  const { geo, value, rules } = state;
  const bud = rules.budget;
  let changed = false;

  if (rules.adjacency) {
    for (let i = 0; i < geo.cells; i += 1) {
      if (value[i] < 0) continue;
      const forbid = ALL & ~(1 << value[i]);
      for (const j of geo.neighbours[i]) {
        if (value[j] < 0 && trim(state, j, forbid, "neighbour-exclusion", { from: i })) {
          changed = true;
          if (state.contradiction) return true;
        }
      }
    }
  }

  for (const [i, j] of state.bonds) {
    if (value[i] >= 0 && value[j] < 0) {
      if (trim(state, j, 1 << (value[i] ^ 1), "bond-complement", { from: i })) changed = true;
    } else if (value[j] >= 0 && value[i] < 0) {
      if (trim(state, i, 1 << (value[j] ^ 1), "bond-complement", { from: j })) changed = true;
    }
    if (state.contradiction) return true;
  }

  for (let l = 0; l < geo.lines.length; l += 1) {
    for (let f = 0; f < 2; f += 1) {
      if (state.family[l * 2 + f] < bud.family) continue;
      const forbid = ALL & ~FAMILY_MASK[f];
      for (const i of geo.lines[l]) {
        if (value[i] < 0 && trim(state, i, forbid, "family-saturation", { family: f, line: l })) {
          changed = true;
          if (state.contradiction) return true;
        }
      }
    }
    for (let b = 0; b < 4; b += 1) {
      if (state.base[l * 4 + b] < bud.max[b]) continue;
      const forbid = ALL & ~(1 << b);
      for (const i of geo.lines[l]) {
        if (value[i] < 0 && trim(state, i, forbid, "count-saturation", { base: b, line: l })) {
          changed = true;
          if (state.contradiction) return true;
        }
      }
    }
  }

  return changed;
}

function tierTwo(state) {
  const { geo, value, cand, rules } = state;
  const bud = rules.budget;
  let changed = false;

  for (let l = 0; l < geo.lines.length; l += 1) {
    const open = geo.lines[l].filter((i) => value[i] < 0);

    for (let f = 0; f < 2; f += 1) {
      const remaining = bud.family - state.family[l * 2 + f];
      if (remaining <= 0) continue;
      const homes = open.filter((i) => cand[i] & FAMILY_MASK[f]);
      if (homes.length < remaining) {
        state.contradiction = true;
        return true;
      }
      if (homes.length !== remaining) continue;
      for (const i of homes) {
        if (trim(state, i, FAMILY_MASK[f], "family-completion", { family: f, line: l })) {
          changed = true;
        }
        if (state.contradiction) return true;
      }
    }

    for (let b = 0; b < 4; b += 1) {
      const remaining = bud.min[b] - state.base[l * 4 + b];
      if (remaining <= 0) continue;
      const homes = open.filter((i) => cand[i] & (1 << b));
      if (homes.length < remaining) {
        state.contradiction = true;
        return true;
      }
      if (homes.length !== remaining) continue;
      for (const i of homes) {
        if (trim(state, i, 1 << b, "count-completion", { base: b, line: l })) changed = true;
        if (state.contradiction) return true;
      }
    }
  }

  for (const [i, j] of state.bonds) {
    if (trim(state, i, COMPLEMENT_MASK[cand[j]], "bond-narrowing", { from: j })) changed = true;
    if (state.contradiction) return true;
    if (trim(state, j, COMPLEMENT_MASK[cand[i]], "bond-narrowing", { from: i })) changed = true;
    if (state.contradiction) return true;
  }

  return changed;
}

function tierThree(state) {
  const { geo, value, cand, rules } = state;
  const bud = rules.budget;
  let changed = false;

  for (let l = 0; l < geo.lines.length; l += 1) {
    const open = geo.lines[l].filter((i) => value[i] < 0);
    if (open.length < 3) continue;
    for (let size = 2; size <= 3; size += 1) {
      for (const subset of combinations(open, size)) {
        let union = 0;
        for (const i of subset) union |= cand[i];
        if (POPCOUNT[union] > size) continue;
        let capacity = 0;
        for (let b = 0; b < 4; b += 1) {
          if (union & (1 << b)) capacity += bud.max[b] - state.base[l * 4 + b];
        }
        if (capacity !== subset.length) continue;
        const forbid = ALL & ~union;
        for (const i of open) {
          if (subset.includes(i)) continue;
          if (trim(state, i, forbid, "naked-subset", { line: l, union })) changed = true;
          if (state.contradiction) return true;
        }
      }
    }
  }

  if (!rules.adjacency) return changed;

  for (let l = 0; l < geo.lines.length; l += 1) {
    const axis = l < geo.n ? 0 : 1;
    for (let b = 0; b < 4; b += 1) {
      const remaining = bud.min[b] - state.base[l * 4 + b];
      if (remaining <= 0) continue;
      const spots = geo.lines[l]
        .filter((i) => value[i] < 0 && cand[i] & (1 << b))
        .map((i) => ({ i, at: geo.offsetIn[i][axis] }));
      if (maxIndependent(spots.map((s) => s.at)) < remaining) {
        state.contradiction = true;
        return true;
      }
      for (const spot of spots) {
        const without = spots.filter((s) => s.at !== spot.at).map((s) => s.at);
        if (maxIndependent(without) < remaining) {
          if (trim(state, spot.i, 1 << b, "spacing-squeeze", { base: b, line: l })) changed = true;
          if (state.contradiction) return true;
        }
      }
    }
  }

  return changed;
}

const TIERS = [tierOne, tierTwo, tierThree];

function logicalSolve(geo, rules, givens, bonds, maxTier) {
  const state = createState(geo, rules, givens, bonds);
  for (;;) {
    let progressed = false;
    for (let tier = 0; tier < maxTier; tier += 1) {
      if (TIERS[tier](state)) {
        progressed = true;
        break; // Always fall back to the cheapest technique that still works.
      }
    }
    if (state.contradiction) return { solved: false, state };
    if (!progressed) break;
  }
  return { solved: Array.from(state.value).every((v) => v >= 0), state };
}

function* combinations(values, size, start = 0, current = []) {
  if (current.length === size) {
    yield [...current];
    return;
  }
  for (let i = start; i < values.length; i += 1) {
    current.push(values[i]);
    yield* combinations(values, size, i + 1, current);
    current.pop();
  }
}

function maxIndependent(positions) {
  const sorted = [...positions].sort((a, b) => a - b);
  let taken = 0;
  let last = -10;
  for (const at of sorted) {
    if (at - last >= 2) {
      taken += 1;
      last = at;
    }
  }
  return taken;
}

/* ========================================================================== */
/* 4. Independent brute-force verifier                                        */
/* ========================================================================== */

/** Separate from the logical solver on purpose, so it cannot inherit its bugs. */
function countSolutions(geo, rules, givens, bonds, limit) {
  const { cells, n, neighbours } = geo;
  const bud = rules.budget;
  const partner = new Int16Array(cells).fill(-1);
  for (const [i, j] of bonds) {
    partner[i] = j;
    partner[j] = i;
  }
  const grid = new Int8Array(givens);
  const rowBase = new Int8Array(n * 4);
  const colBase = new Int8Array(n * 4);
  const rowFamily = new Int8Array(n * 2);
  const colFamily = new Int8Array(n * 2);
  const rowOpen = new Int8Array(n).fill(n);
  const colOpen = new Int8Array(n).fill(n);

  const account = (i, b, delta) => {
    const r = Math.floor(i / n);
    const c = i % n;
    rowBase[r * 4 + b] += delta;
    colBase[c * 4 + b] += delta;
    rowFamily[r * 2 + (b >> 1)] += delta;
    colFamily[c * 2 + (b >> 1)] += delta;
    rowOpen[r] -= delta;
    colOpen[c] -= delta;
  };

  for (let i = 0; i < cells; i += 1) if (grid[i] >= 0) account(i, grid[i], 1);

  const options = (i) => {
    let mask = ALL;
    const r = Math.floor(i / n);
    const c = i % n;
    for (let b = 0; b < 4; b += 1) {
      if (rowBase[r * 4 + b] === bud.max[b] || colBase[c * 4 + b] === bud.max[b]) mask &= ~(1 << b);
      const f = b >> 1;
      if (rowFamily[r * 2 + f] === bud.family || colFamily[c * 2 + f] === bud.family) {
        mask &= ~(1 << b);
      }
    }
    if (rules.adjacency) for (const j of neighbours[i]) if (grid[j] >= 0) mask &= ~(1 << grid[j]);
    const p = partner[i];
    if (p >= 0 && grid[p] >= 0) mask &= 1 << (grid[p] ^ 1);
    return mask;
  };

  // A line cannot still owe more minimums than it has empty cells.
  const feasible = () => {
    for (let l = 0; l < n; l += 1) {
      let owedRow = 0;
      let owedCol = 0;
      for (let b = 0; b < 4; b += 1) {
        owedRow += Math.max(0, bud.min[b] - rowBase[l * 4 + b]);
        owedCol += Math.max(0, bud.min[b] - colBase[l * 4 + b]);
      }
      if (owedRow > rowOpen[l] || owedCol > colOpen[l]) return false;
    }
    return true;
  };

  let found = 0;
  const search = () => {
    if (found >= limit) return;
    if (!feasible()) return;
    let target = -1;
    let best = 5;
    let bestMask = 0;
    for (let i = 0; i < cells; i += 1) {
      if (grid[i] >= 0) continue;
      const mask = options(i);
      const size = POPCOUNT[mask];
      if (size === 0) return;
      if (size < best) {
        best = size;
        target = i;
        bestMask = mask;
        if (size === 1) break;
      }
    }
    if (target === -1) {
      found += 1;
      return;
    }
    for (let b = 0; b < 4; b += 1) {
      if (!(bestMask & (1 << b))) continue;
      grid[target] = b;
      account(target, b, 1);
      search();
      account(target, b, -1);
      grid[target] = -1;
      if (found >= limit) return;
    }
  };
  search();
  return found;
}

/* ========================================================================== */
/* 5. Clue removal                                                            */
/* ========================================================================== */

function carve(geo, rules, solution, bonds, maxTier, random, floor = 0) {
  const givens = new Int8Array(solution);
  let remaining = geo.cells;
  for (const i of shuffled([...Array(geo.cells).keys()], random)) {
    if (remaining <= floor) break;
    const backup = givens[i];
    givens[i] = -1;
    const result = logicalSolve(geo, rules, givens, bonds, maxTier);
    const matches =
      result.solved && Array.from(result.state.value).every((v, c) => v === solution[c]);
    if (matches) remaining -= 1;
    else givens[i] = backup;
  }
  return givens;
}

function difficultyScore(state, givens, bonds) {
  let technique = 0;
  for (const [name, uses] of Object.entries(state.counts)) {
    technique += (TECHNIQUES[name]?.weight ?? 0) * uses;
  }
  const empties = Array.from(givens).filter((v) => v < 0).length;
  return Math.round(technique + empties * 0.6 - bonds.length * 1.5);
}

/* ========================================================================== */
/* Report                                                                     */
/* ========================================================================== */

function render(geo, givens, bonds) {
  const bondOf = new Map();
  bonds.forEach(([i, j], index) => {
    const tag = String.fromCharCode(97 + index);
    bondOf.set(i, tag);
    bondOf.set(j, tag);
  });
  const rows = [];
  for (let r = 0; r < geo.n; r += 1) {
    const cells = [];
    for (let c = 0; c < geo.n; c += 1) {
      const i = r * geo.n + c;
      cells.push((givens[i] >= 0 ? LETTERS[givens[i]] : "·") + (bondOf.get(i) ?? " "));
    }
    rows.push(cells.join(" "));
  }
  return rows.join("\n");
}

const seed = Number(process.argv[2] ?? 20260801);
const samples = Number(process.argv[3] ?? 20);
const random = mulberry32(seed);

/* --- teach mode: emit worked examples for the design documents ------------ */
if (process.argv.includes("--teach")) {
  const NAMES = {
    "naked-single": "only one base left",
    "neighbour-exclusion": "a neighbour already holds it",
    "bond-complement": "its bond partner is known",
    "family-saturation": "that pair's half of the line is full",
    "count-saturation": "that base has used up the line",
    "family-completion": "the line still owes that pair",
    "count-completion": "the line still owes that base",
    "bond-narrowing": "the partner's options limit this one",
  };
  const cases = [
    { title: "TUTORIAL 4x4", n: 4, bonds: 2, tier: 1, floor: 0 },
    { title: "EASY 6x6", n: 6, bonds: 5, tier: 2, floor: 18 },
    { title: "MEDIUM 6x6", n: 6, bonds: 5, tier: 2, floor: 0 },
  ];
  for (const c of cases) {
    const geo = geometry(c.n);
    const rules = { budget: budget("familyAll", c.n), adjacency: true };
    const solution = generateSolution(geo, rules, random);
    const bonds = pickBonds(geo, solution, c.bonds, random);
    const givens = carve(geo, rules, solution, bonds, c.tier, random, c.floor);
    const { solved, state } = logicalSolve(geo, rules, givens, bonds, c.tier);
    const rc = (i) => `r${Math.floor(i / c.n) + 1}c${(i % c.n) + 1}`;

    console.log(`\n### ${c.title} — solved by logic alone: ${solved}, unique: ${countSolutions(geo, rules, givens, bonds, 2) === 1}`);
    console.log("givens:");
    console.log(render(geo, givens, bonds));
    console.log("solution:");
    console.log(render(geo, solution, bonds));
    console.log("bonds: " + bonds.map(([i, j], n) => `${String.fromCharCode(97 + n)} ${rc(i)}<->${rc(j)}`).join(", "));
    console.log("clues: " + Array.from(givens).filter((v) => v >= 0).length + " / " + geo.cells);
    console.log("first 14 placements of the intended solve path:");
    let shown = 0;
    for (let k = 0; k < state.path.length && shown < 14; k += 1) {
      const stepRec = state.path[k];
      if (stepRec.technique !== "naked-single") continue;
      const why = state.path
        .slice(0, k)
        .filter((e) => e.cell === stepRec.cell && e.technique !== "naked-single")
        .map((e) => NAMES[e.technique] ?? e.technique);
      shown += 1;
      console.log(`  ${String(shown).padStart(2)}. ${rc(stepRec.cell)} = ${LETTERS[stepRec.value]}   <- ${[...new Set(why)].join("; ")}`);
    }
  }
  process.exit(0);
}

/* --- soak mode: one configuration, many samples, generator reliability ---- */
if (process.argv.includes("--soak")) {
  const geo = geometry(6);
  const rules = { budget: budget("familyAll", 6), adjacency: true };
  const runs = 300;
  const seen = new Set();
  const clues = [];
  let unique = 0;
  let logicOnly = 0;
  const started = Date.now();

  for (let sample = 0; sample < runs; sample += 1) {
    const solution = generateSolution(geo, rules, random);
    const bonds = pickBonds(geo, solution, 5, random);
    const givens = carve(geo, rules, solution, bonds, 2, random);
    const { solved } = logicalSolve(geo, rules, givens, bonds, 2);
    if (solved) logicOnly += 1;
    if (countSolutions(geo, rules, givens, bonds, 2) === 1) unique += 1;
    clues.push(Array.from(givens).filter((v) => v >= 0).length);
    seen.add(Array.from(solution).join("") + "|" + bonds.map((b) => b.join(":")).join(","));
  }

  const mean = clues.reduce((a, b) => a + b, 0) / clues.length;
  console.log(`soak — 6x6 medium configuration, ${runs} puzzles`);
  console.log(`  logic-only solvable   ${logicOnly}/${runs}`);
  console.log(`  exactly one solution  ${unique}/${runs}`);
  console.log(`  distinct puzzles      ${seen.size}/${runs}`);
  console.log(`  clues                 mean ${mean.toFixed(1)}, range ${Math.min(...clues)}-${Math.max(...clues)}`);
  console.log(`  throughput            ${(runs / ((Date.now() - started) / 1000)).toFixed(0)} puzzles/second`);
  process.exit(0);
}

const TRIALS = [
  // --- rule-system comparison (does each rule earn its place?) -------------
  { group: "compare", label: "6x6 all-four + touch + 6 bonds", n: 6, mode: "familyAll", adjacency: true, bonds: 6, tier: 3 },
  { group: "compare", label: "6x6 all-four + touch + 3 bonds", n: 6, mode: "familyAll", adjacency: true, bonds: 3, tier: 3 },
  { group: "compare", label: "6x6 all-four + touch + 0 bonds", n: 6, mode: "familyAll", adjacency: true, bonds: 0, tier: 3 },
  { group: "compare", label: "6x6 all-four  NO touch + 6 bnd", n: 6, mode: "familyAll", adjacency: false, bonds: 6, tier: 3 },
  { group: "compare", label: "6x6 pair-only + touch + 6 bnd ", n: 6, mode: "family", adjacency: true, bonds: 6, tier: 3 },

  // --- the proposed shipping ladder ---------------------------------------
  { group: "ladder", label: "TUTORIAL 4x4  tier1  2 bonds   ", n: 4, mode: "familyAll", adjacency: true, bonds: 2, tier: 1 },
  { group: "ladder", label: "EASY     6x6  tier2  5 bonds f18", n: 6, mode: "familyAll", adjacency: true, bonds: 5, tier: 2, floor: 18 },
  { group: "ladder", label: "MEDIUM   6x6  tier3  5 bonds   ", n: 6, mode: "familyAll", adjacency: true, bonds: 5, tier: 3 },
  { group: "ladder", label: "HARD     8x8  tier3  7 bonds   ", n: 8, mode: "familyAll", adjacency: true, bonds: 7, tier: 3 },
  { group: "ladder", label: "LAB     10x10 tier3  9 bonds   ", n: 10, mode: "familyAll", adjacency: true, bonds: 9, tier: 3, samples: 8 },
];

console.log(`OneDna feasibility — seed ${seed}, ${samples} samples per row\n`);
console.log(
  "configuration                     gen    unique   clues   fills  score   ms   required tier         technique uses per puzzle",
);
console.log("-".repeat(150));

const showcase = [];
let lastGroup = null;

for (const trial of TRIALS) {
  if (lastGroup && trial.group !== lastGroup) console.log("-".repeat(150));
  lastGroup = trial.group;

  const geo = geometry(trial.n);
  const rules = { budget: budget(trial.mode, trial.n), adjacency: trial.adjacency };
  const runs = trial.samples ?? samples;
  const clueCounts = [];
  const scores = [];
  const techniqueUse = {};
  let uniqueOk = 0;
  let failures = 0;
  const tierNeed = {};
  const started = Date.now();

  for (let sample = 0; sample < runs; sample += 1) {
    const solution = generateSolution(geo, rules, random);
    if (!solution) {
      failures += 1;
      continue;
    }
    const bonds = pickBonds(geo, solution, trial.bonds, random);
    const givens = carve(geo, rules, solution, bonds, trial.tier, random, trial.floor ?? 0);
    const { solved, state } = logicalSolve(geo, rules, givens, bonds, trial.tier);
    if (solved && countSolutions(geo, rules, givens, bonds, 2) === 1) uniqueOk += 1;

    // The honest difficulty signal: the cheapest tier that still cracks it.
    let required = trial.tier;
    for (let t = 1; t <= trial.tier; t += 1) {
      if (logicalSolve(geo, rules, givens, bonds, t).solved) {
        required = t;
        break;
      }
    }
    tierNeed[required] = (tierNeed[required] ?? 0) + 1;

    clueCounts.push(Array.from(givens).filter((v) => v >= 0).length);
    scores.push(difficultyScore(state, givens, bonds));
    for (const [name, uses] of Object.entries(state.counts)) {
      techniqueUse[name] = (techniqueUse[name] ?? 0) + uses;
    }
    if (sample === 0) showcase.push({ trial, geo, rules, givens, bonds, solution });
  }

  const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
  const clues = mean(clueCounts);
  const breakdown = Object.keys(TECHNIQUES)
    .filter((name) => techniqueUse[name])
    .map((name) => `${name}=${(techniqueUse[name] / clueCounts.length).toFixed(1)}`)
    .join(" ");

  console.log(
    [
      trial.label.padEnd(34),
      `${clueCounts.length}/${runs}`.padEnd(7),
      `${uniqueOk}/${clueCounts.length}`.padEnd(9),
      clues.toFixed(1).padStart(5).padEnd(8),
      String(geo.cells - Math.round(clues)).padEnd(7),
      mean(scores).toFixed(0).padEnd(8),
      String(Math.round((Date.now() - started) / Math.max(clueCounts.length, 1))).padEnd(5),
      `needs t1/t2/t3 ${tierNeed[1] ?? 0}/${tierNeed[2] ?? 0}/${tierNeed[3] ?? 0}`.padEnd(22),
      breakdown,
    ].join(""),
  );
  void failures;
}

console.log("\n--- first sample of each configuration (letter = bond id) ---\n");
for (const { trial, geo, givens, bonds, solution } of showcase) {
  console.log(trial.label);
  console.log(render(geo, givens, bonds));
  console.log("  solution:");
  console.log(
    render(geo, solution, bonds)
      .split("\n")
      .map((row) => `  ${row}`)
      .join("\n"),
  );
  console.log();
}
