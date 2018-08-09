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
		const r1 = rand(max)
		let r2 = rand(max - 1)
		if (r2 >= r1) r2++ //r2 between 0 and max, but not equal to r1
		[board[r1], board[r2]] = [board[r2], board[r1]]
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
const sortByLength = <T>(region1: T[], region2: T[]) => region1.length - region2.length
function addCage(board: Board, cages: Cage[], boxes: Box[]) {
	const numbers = boxes.map(([row, col]) => board[row][col])
	let op: Op, val: number
	if (boxes.length === 1) {
		op = '='
		;[val] = numbers
	}
	else {
		const max = Math.max(...numbers)
		const sum = numbers.reduce((a, b) => a + b),
		  product = numbers.reduce((a, b) => a * b)
		const maxMinus = (max << 1) - sum,
		        maxDiv = max ** 2 / product
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
	cages.push({op, val, boxes})
}

export function makeCages(board: Board): Cage[] {
	const max = board.length
	const cagedBoxes = new Set<BoxId>() //boxes in any cage
	const neighborsOf = ([r, c]: Box) =>
		DIRS
			.map(([dr, dc]) => [r + dr, c + dc] as Box)
			.filter(neighbor => neighbor.every(x => 0 <= x && x < max) && !cagedBoxes.has(boxId(neighbor)))
	const fullGrid: Box[] = []
	for (let row = 0; row < max; row++) {
		for (let col = 0; col < max; col++) fullGrid.push([row, col])
	}
	const unallocatedRegions: Box[][] = [fullGrid] //sorted by size
	const cages: Cage[] = []
	//Generate cages while there are unallocated regions of size > maxCage
	while (unallocatedRegions.length) {
		const region = unallocatedRegions.pop()! //choose largest region from which to carve out a cage
		const regionRemaining = new Set(region.map(boxId)) //boxes in region which have not been put into cage
		const cageSize = makeCageSize()
		const cageStart = chooseRand(region)
		//Execute partial DFS from cageStart until cage has reached cageSize or no more neighbors exist
		const cage: Box[] = []
		const neighbors = [cageStart] //possible adjacent boxes to add to cage
		const markedNeighbors = new Set([boxId(cageStart)]) //cage ∪ neighbors
		while (cage.length < cageSize && neighbors.length) {
			const cageBox = extractRand(neighbors) //new box selected to add to cage
			const cageBoxId = boxId(cageBox)
			cage.push(cageBox)
			cagedBoxes.add(cageBoxId)
			regionRemaining.delete(cageBoxId)
			for (const neighbor of neighborsOf(cageBox)) {
				const neighborId = boxId(neighbor)
				if (!markedNeighbors.has(neighborId)) {
					neighbors.push(neighbor)
					markedNeighbors.add(neighborId)
				}
			}
		}
		addCage(board, cages, cage)
		while (regionRemaining.size) {
			const [regionStart] = regionRemaining
			//Execute DFS from regionStart, adding reached vertices to region
			const toExplore = [fromBoxId(regionStart)]
			regionRemaining.delete(regionStart)
			const region: Box[] = []
			while (toExplore.length) {
				const regionBox = toExplore.pop()!
				region.push(regionBox)
				for (const neighbor of neighborsOf(regionBox)) {
					const neighborId = boxId(neighbor)
					if (regionRemaining.has(neighborId)) {
						toExplore.push(neighbor)
						regionRemaining.delete(neighborId)
					}
				}
			}
			insertIntoSorted(unallocatedRegions, region, sortByLength)
		}
	}
	return cages
}