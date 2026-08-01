# OneWord word-list notice

The accepted-guess dictionary is generated from `enable1.txt` in the ENABLE
(Enhanced North American Benchmark Lexicon) word list. ENABLE was released to
the public domain by its maintainers. Source snapshot:

- https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt
- Retrieved: 2026-08-01

Transformation: trim, retain exact five-letter ASCII alphabetic entries,
uppercase, deduplicate, and sort. Run:

`node scripts/generate-word-list.mjs /path/to/enable1.txt`

The 365-word answer schedule is an original editorial subset maintained in
`answers.ts`. It is deliberately smaller and friendlier than the accepted
dictionary. New answers must be appended; reordering published entries changes
historical puzzles and is prohibited.
