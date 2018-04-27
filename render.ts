#!/usr/bin/env node
import * as fs from 'fs'
import * as sb from 'structure-bytes'
import {Cage, Puzzle, puzzleType, solutionType} from './types'

const PUZZLE_FILE = 'puzzle.html'

const {argv} = process
if (argv.length !== 3) throw new Error('Usage: ./render.js path/to/cagings.sbv')

const readPuzzle = new Promise<Puzzle>((resolve, reject) => {
	sb.readValue({
		type: puzzleType,
		inStream: fs.createReadStream(argv[2])
	}, (err, value) => {
		if (err) reject(err)
		else resolve(value!)
	})
})
const readSolutions = new Promise<number[]>((resolve, reject) => {
	sb.readValue({
		type: solutionType,
		inStream: fs.createReadStream('solution.sbv')
	}, (err, solution) => {
		if (err) reject(err)
		else resolve(solution!)
	})
})
Promise.all([readPuzzle, readSolutions])
	.then(([puzzle, solution]) => {
		const {max, cages} = puzzle!
		const boxCage = new Map<string, Cage>() //map of '1 2' to cage
		const boxOps = new Map<string, string>() //map of '1 2' to cage operation to display
		for (const cage of cages) {
			const {op, val, boxes} = cage
			let topLeftBox: [number, number] = [Infinity, Infinity]
			for (const [r, c] of boxes) {
				boxCage.set([r, c].join(' '), cage)
				const [topLeftR, topLeftC] = topLeftBox
				if (r < topLeftR || (r === topLeftR && c < topLeftC)) topLeftBox = [r, c]
			}
			boxOps.set(topLeftBox.join(' '), val + (op === '=' ? '' : op))
		}
		const out: string[] = []
		out.push('<head><style>')
			out.push(
				'table{position:relative;top:10px;border-collapse:collapse}',
				'td{position:relative;width:50px;height:50px;border:1.5px dashed black;font-family:Arial,Helvetica,sans-serif}',
				'td.top{border-top:2px solid black}',
				'td.left{border-left:2px solid black}',
				'td.right{border-right:2px solid black}',
				'td.bottom{border-bottom:2px solid black}',
				'span.op{position:absolute;top:0;font-size:12px}',
				'span.value{display:none;position:absolute;top:10px;left:16px;font-size:28px}',
				'input:checked~table span.value{display:block}'
			)
		out.push('</style></head>')
		out.push('<body>')
			out.push('Show solutions<input type=checkbox>')
			out.push('<table>')
			for (let r = 0; r < max; r++) {
				out.push('<tr>')
				for (let c = 0; c < max; c++) {
					const boxId = [r, c].join(' ')
					const thisCage = boxCage.get(boxId)
					const borders: string[] = []
					if (r === 0 || boxCage.get([r - 1, c].join(' ')) !== thisCage) borders.push('top')
					if (c === 0 || boxCage.get([r, c - 1].join(' ')) !== thisCage) borders.push('left')
					if (c === max - 1 || boxCage.get([r, c + 1].join(' ')) !== thisCage) borders.push('right')
					if (r === max - 1 || boxCage.get([r + 1, c].join(' ')) !== thisCage) borders.push('bottom')
					out.push('<td')
					if (borders.length) out.push(' class="' + borders.join(' ') + '"')
					out.push('>')
					const op = boxOps.get(boxId)
					if (op) out.push('<span class=op>', op, '</span>')
					out.push('<span class=value>', String(solution[r * max + c]), '</span>')
					out.push('</td>')
				}
				out.push('</tr>')
			}
			out.push('</table>')
		out.push('</body>')
		fs.writeFile(PUZZLE_FILE, out.join(''), err => {
			if (err) throw err
		})
	})
	.catch(console.error)