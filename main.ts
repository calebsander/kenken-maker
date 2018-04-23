#!/usr/bin/env node
import * as fs from 'fs'
import {promisify} from 'util'
import * as sb from 'structure-bytes'
import {makeBoard, makeCages} from './make-board'
import {makeSolvingBoard} from './solve'
import {Cage, puzzleType, solutionType} from './types'

const SOLUTION_FILE = 'solution.sbv'
const CAGINGS_DIR = 'cagings'

function usageError() {
	throw new Error('Usage: ./main.js boardSize')
}

const {argv} = process
if (argv.length !== 3) usageError()
const size = Number(argv[2])
if (isNaN(size)) usageError()

const board = makeBoard(size)
sb.writeValue({
	type: solutionType,
	value: ([] as number[]).concat(...board),
	outStream: fs.createWriteStream(SOLUTION_FILE)
}, err => {
	if (err) throw err
	console.log('Saved solution')
	promisify(fs.mkdir)(CAGINGS_DIR).catch(_ => {})
		.then(makeCaging)
})
const stepsCount = new Map<number, number>() //key 0 for unsolvable
function makeCaging() {
	let cages: Cage[], steps: number
	let solved = false
	while (!solved) {
		cages = makeCages(board)
		const solvingBoard = makeSolvingBoard(size, cages)
		steps = solvingBoard.solve()
		if (solvingBoard.isSolved()) solved = true
		else stepsCount.set(0, (stepsCount.get(0) || 0) + 1)
	}
	stepsCount.set(steps!, (stepsCount.get(steps) || 0) + 1)
	console.log(stepsCount)
	const cagingDir = CAGINGS_DIR + '/' + String(steps)
	promisify(fs.mkdir)(cagingDir).catch(_ => {})
		.then(() => new Promise<void>((resolve, reject) =>
			sb.writeValue({
				type: puzzleType,
				value: {max: size, cages},
				outStream: fs.createWriteStream(cagingDir + '/' + String(stepsCount.get(steps)) + '.sbv')
			}, err => {
				if (err) reject(err)
				else resolve()
			})
		))
		.then(makeCaging)
}