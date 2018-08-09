# kenken-maker

The aim of this project is to randomly generate [KenKen](http://kenkenpuzzle.com) puzzles, with a difficulty metric to help find interesting ones.
I am currently using it to provide KenKen puzzles for Caltech's newspaper.

## Running the code

Run the following commands to compile the TypeScript code:
````bash
npm i
npm run build
````

`main.js` creates a random puzzle solution and then continually generates cagings which can be solved to give that solution.
For larger grid sizes, `main.js` may need to be run for at least about 20 minutes, especially if you are looking for a very difficult puzzle.
The shared solution to all these puzzles is stored in `solution.sbv`, and the different cagings are stored in the `cagings` folder, grouped by difficulty.
For example, `cagings/5/1.sbv` is the first puzzle generated with difficulty 5, `cagings/5/2.sbv` is the second puzzle generated with difficulty 5, and so on.
Running `main.js` will look something like this:
````
$ ./main.js 9 #generate 9x9 puzzles
Saved solution
Successes: 33.33333333333333%; Counts: 0: 2, 5: 1
Successes: 50%; Counts: 0: 2, 5: 2
Successes: 37.5%; Counts: 0: 5, 4: 1, 5: 2
Successes: 30.76923076923077%; Counts: 0: 9, 4: 1, 5: 2, 6: 1
Successes: 35.714285714285715%; Counts: 0: 9, 4: 2, 5: 2, 6: 1
Successes: 40%; Counts: 0: 9, 4: 2, 5: 3, 6: 1
Successes: 33.33333333333333%; Counts: 0: 14, 4: 3, 5: 3, 6: 1
Successes: 36.36363636363637%; Counts: 0: 14, 4: 4, 5: 3, 6: 1
Successes: 37.5%; Counts: 0: 15, 3: 1, 4: 4, 5: 3, 6: 1
Successes: 37.03703703703704%; Counts: 0: 17, 3: 1, 4: 4, 5: 3, 6: 2
Successes: 25.581395348837212%; Counts: 0: 32, 3: 1, 4: 4, 5: 4, 6: 2
Successes: 22.22222222222222%; Counts: 0: 42, 3: 1, 4: 4, 5: 4, 6: 2, 8: 1
Successes: 23.214285714285715%; Counts: 0: 43, 3: 1, 4: 4, 5: 4, 6: 3, 8: 1
Successes: 22.58064516129032%; Counts: 0: 48, 3: 1, 4: 4, 5: 4, 6: 3, 8: 1, 10: 1
# Of the cagings tried so far, 48 were not solvable, 1 had difficulty 3, 4 had difficulty 4, and so on
# 22.6% of the cagings tried so far were solvable using the available solving strategies
````

The generated cagings are stored in a [structure-bytes](https://github.com/calebsander/structure-bytes) format to minimize the space they take up on disk, as there may be thousands of them.
To view a generated puzzle, run `render.js`, which creates a `puzzle.html`:
````bash
./render.js cagings/10/1.sbv
open puzzle.html
````

## How puzzles are generated

There are essentially 3 steps to generating an `n` by `n` puzzle:

1. Create a random solution grid (i.e. every row and column has each number `1` to `n`)—in `make-board.ts`
2. Create a random caging of the grid—in `make-board.ts`
3. Attempt to solve the caging using relatively human-friendly strategies; if solving was successful, computing a difficulty metric—in `solve.ts`

### Creating a solution grid

This is the simplest of the 3 steps.
The program starts with a known valid grid, containing `1, 2, ..., n` in the first row and each subsequent row is shifted over once more.
If `n` is 4, for example, the starting grid looks like this:
````
1 2 3 4
2 3 4 1
3 4 1 2
4 1 2 3
````
The program then uses the fact that swapping rows maintains a valid grid, as does transposing the grid.
So the program chooses 2 random rows to swap and then takes the transpose of this new grid, and repeats this process 100,000 times.

### Creating a random caging

A list of "unallocated regions" is maintained, from which cages are carved out.
Initially, the whole grid is a single unallocated region.
While unallocated regions remain, the largest one is selected to have a cage carved out of it.
A random desired cage size is computed, and an initial box in the unallocated region is randomly chosen to be in the cage.
Adjacent boxes to the boxes already added to the cage are added to the cage until the cage reaches the desired size or the unallocated region is exhausted.
The remaining boxes in the unallocated regions are assembled into new unallocated regions.

For example, consider a 3x3 grid, where the numbers denote unallocated regions:
````
1. Initially   2. Cage A of size 3   3. Cage B of size 2
1 1 1          1 A 2                 1 A 2
1 1 1          A A 2                 A A 2
1 1 1          2 2 2                 B B 2

4. Cage C of size 4 (capped at 3)   5. Cage D of size 3 (capped at 1)
1 A C                               D A C
A A C                               A A C
B B C                               B B C
````
Once the boxes in each cage have been decided, the cage operation is picked randomly.
Cages with a single box are forced to be `=`; `/` and `-` are prioritized if it is possible to make the value a positive integer; `+` or `*` can be chosen in any case.

### Solving a caging

The solving process attempts to mimic how a human would solve the puzzle, so for example, it does not guess a box's value and check whether that would create conflicts later in the solving process.
The solving rules are as follows:

- Arithmetic restriction: look at each cage and find all possible ways to fill in the boxes with numbers `1` to `n`.
	Throw out all combinations that would lead to the same number being in any row or column.
	For each box, restrict its possible values to the values it could take on in any valid combination.
	In addition, if every possible combination causes some row to have a box with some number `C`, `C` is excluded from the rest of that row.

	For example, in a 6x6 puzzle, a cage with 3 boxes and `6*` as its target has the following possible combinations of values:
	````
	[ 1, 1, 6 ]
	[ 1, 2, 3 ]
	[ 1, 3, 2 ]
	[ 1, 6, 1 ]
	[ 2, 1, 3 ]
	[ 2, 3, 1 ]
	[ 3, 1, 2 ]
	[ 3, 2, 1 ]
	[ 6, 1, 1 ]
	````
- Pick uniques: if any box is the only box in its row or column which can have a certain value, it must have that value.
	This can be thought of as a special case of the "find isolated groups" strategy with a group size of `n - 1`, except that works even when `n` is large.
- Find isolated groups: if `k` boxes in a row or column (called a group of size `k`) all have possibility sets which are subsets of a set of size `k`, no other box in that row or column can have any of those `k` values.
	Equivalently, if the union of the possibility sets of those `k` boxes has size `k`, that union can be removed from all other boxes in the row or column.
	The strategy only checks relatively small groups, both to reduce processing time and because it is hard for humans to see groups larger than 3 or 4.
	Note that if `k` is 1, this strategy is simply removing the value of determined boxes from the other boxes in their rows and columns.
- Cross-row eliminate: if there are `k` rows, and in each, the possible locations of some number `C` is some subset of the same `k` columns, no box in any of those `k` columns that is not in one of the `k` rows can have `C`.
	The same is true when using columns instead of rows.

	This is easier to understand when `k` is 2.
	Consider two columns in a 4x4 grid:
	````
	2 or 3     3 or 4
	1 or 2     1 or 4
	1 or 3     1 or 3
	  4          2
	````

	You can see that in each column, 1 must be in either the second or third boxes and 3 must be in either the first or third boxes.
	Even though we don't know which box in each column contains the 1 or the 3, we know that no other box in the second or third rows can have 1, and no other box in the first or third rows can have 3.

Ths is by no means a complete list of solving strategies, but the others I know are much more difficult to program.
For example, it is often possible to find the sum of all the boxes in a row or column except for one, and since the sum of each row and column is `1 + ... + n`, the value of the remaining box's value can be determined.

## The difficulty metric

Informally, the difficulty of a puzzle is measured by the number of sequential logical steps required to solve it.
The idea is, for example, that if every square's value can be found by making at most 5 logical inferences, then this is probably an easier puzzle than if 10 inferences were required to find some square's value.

If the set of partially filled-in grids is considered as a directed acyclic graph where edges represent single inferences, the difficulty metric is the minimum number of edges on a path from the empty grid to the solved grid.
This metric is computed by applying each solver independently to the previous grid, and then taking the intersection of the possibilities given by each of the solvers to compute the next grid.
The number of steps required to solve the grid is then the difficulty metric.
This is probably not the most accurate metric of what makes a puzzle difficult to a human, but I just wanted a general sense of their relative difficulty so I could know which puzzles to choose among.
Among other things, it doesn't consider the breadth of the inference graph or the relative difficulty of steps made by the different solvers.

Caleb Sander, 2018