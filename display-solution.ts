#!/usr/bin/env node
import * as fs from 'fs'
import * as sb from 'structure-bytes'
import {solutionType} from './types'

sb.readValue({
	type: solutionType,
	inStream: fs.createReadStream('solution.sbv')
}, (err, solution) => {
	if (err) throw err
	const max = Math.sqrt(solution!.length)
	for (let rowStart = 0; rowStart < solution!.length; rowStart += max) {
		console.log(solution!.slice(rowStart, rowStart + max).join(' '))
	}
})