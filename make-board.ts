import {Box, Cage, Op} from './types'
import {rand, transpose} from './utils'

const SHUFFLE_TIMES = 1e5 //number of times to shuffle rows and columns when making random board
const MIN_CAGE_SIZE = 1.05, MAX_CAGE_SIZE = 4.7 //decreased probability of size-1 and size-5 cages
const DIV_PROB = 0.5, //probability of picking '/' for cage op if possible
    MINUS_PROB = 0.5  //probability of picking '-' for cage op if possible and '/' not chosen

type Board = number[][] //indexed by row, then col

export function makeBoard(max: number, shuffleTimes = SHUFFLE_TIMES): Board {
	/*Strategy: start with a known board
	  (first row is [1, ..., max] and each subsequent row is shifted over once more)
	  e.g. 1 2 3
	       2 3 1
	       3 1 2
	*/
	let board: Board = []
	for (let row = 0; row < max; row++) {
		const cells: typeof board[0] = []
		for (let col = 0; col < max; col++) cells[col] = (row + col) % max + 1
		board[row] = cells
	}
	//Then alternately swap rows and columns
	for (let _ = 0; _ < shuffleTimes; _++) {
		const r1 = rand(max), r2 = rand(max)
		const temp = board[r1]
		board[r1] = board[r2]
		board[r2] = temp
		board = transpose(board) //what were columns become rows and get swapped next time
	}
	return board
}

const makeCageSize = () =>
	Math.round(MIN_CAGE_SIZE + Math.random() * (MAX_CAGE_SIZE - MIN_CAGE_SIZE))
type BoxId = string
const boxId = (box: Box): BoxId => box.join(' ')
const fromBoxId = (id: BoxId): Box => id.split(' ').map(Number) as Box
const chooseRand = <T>(arr: T[]) => arr[rand(arr.length)]
const extractRand = <T>(arr: T[]) => arr.splice(rand(arr.length), 1)[0]
const DIRS: Box[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
//Operations that can be used for any cage of size > 1 (- and / are not always possible)
const alwaysPossibleOps: Op[] = ['+', '*']
function insertIntoSorted<T>(arr: T[], item: T, comp: (a: T, b: T) => number) {
	const {length} = arr
	let i
	for (i = 0; i < length && comp(item, arr[i]) > 0; i++); //while item > arr[i]
	arr.splice(i, 0, item)
}

export function makeCages(board: Board): Cage[] {
	const max = board.length
	const cagedCells = new Set<BoxId>()
	const neighborsOf = ([row, col]: Box) =>
		DIRS
			.map(([dr, dc]) => [row + dr, col + dc] as Box)
			.filter(neighbor => neighbor.every(x => 0 <= x && x < max) && !cagedCells.has(boxId(neighbor)))
	const fullGrid: Box[] = []
	for (let row = 0; row < max; row++) {
		for (let col = 0; col < max; col++) fullGrid.push([row, col])
	}
	const unallocatedRegions: Box[][] = [fullGrid] //sorted by size
	const cages: Cage[] = []
	function addCage(cage: Box[]) {
		const numbers = cage.map(([row, col]) => board[row][col])
		let op: Op, val: number
		if (cage.length === 1) {
			op = '='
			;[val] = numbers
		}
		else {
			const max = Math.max(...numbers)
			const sum = numbers.reduce((a, b) => a + b),
			  product = numbers.reduce((a, b) => a * b)
			const maxMinus = max - (sum - max),
			        maxDiv = max / (product / max)
			op =
				(maxDiv === (maxDiv | 0) && Math.random() < DIV_PROB) ? '/' : //try to use div if possible, since this is rarer
				(maxMinus > 0 && Math.random() < MINUS_PROB) ? '-' :
				chooseRand(alwaysPossibleOps)
			switch (op) {
				case '+':
					val = sum
					break
				case '*':
					val = product
					break
				case '-':
					val = maxMinus
					break
				case '/':
					val = maxDiv
					break
				default:
					throw new Error('Unknown op: ' + op)
			}
		}
		cages.push({
			op,
			val,
			boxes: cage
		})
	}
	//Generate cages while there are unallocated regions of size > maxCage
	while (unallocatedRegions.length) {
		const region = unallocatedRegions.pop()! //region from which to carve out a cage
		const regionRemaining = new Set(region.map(boxId))
		const cageSize = makeCageSize()
		const cageStart = chooseRand(region)
		const cage: Box[] = []
		function addToCage(box: Box) {
			cage.push(box)
			cagedCells.add(boxId(box))
			regionRemaining.delete(boxId(box))
		}
		addToCage(cageStart)
		const neighbors: Box[] = neighborsOf(cageStart)
		while (cage.length < cageSize && neighbors.length) {
			const neighbor = extractRand(neighbors)
			if (!regionRemaining.has(boxId(neighbor))) continue
			addToCage(neighbor)
			neighbors.push(...neighborsOf(neighbor))
		}
		addCage(cage)
		while (regionRemaining.size) {
			const [subRegionStart] = regionRemaining
			regionRemaining.delete(subRegionStart)
			const unallocatedRegion = [fromBoxId(subRegionStart)]
			const neighbors = neighborsOf(fromBoxId(subRegionStart))
			while (neighbors.length) {
				const nextNeighbor = neighbors.pop()!
				const nextId = boxId(nextNeighbor)
				if (!regionRemaining.has(nextId)) continue
				regionRemaining.delete(nextId)
				unallocatedRegion.push(nextNeighbor)
				neighbors.push(...neighborsOf(nextNeighbor))
			}
			insertIntoSorted(unallocatedRegions, unallocatedRegion, (region1, region2) => region1.length - region2.length)
		}
	}
	unallocatedRegions.forEach(addCage)
	return cages
}