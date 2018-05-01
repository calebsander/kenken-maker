import * as sb from 'structure-bytes'

export type Op = '=' | '+' | '-' | '*' | '/'
export type Box = [number, number] //[row, column]
export interface Cage {
	op: Op
	val: number
	boxes: Box[]
}
export interface Puzzle {
	max: number
	cages: Cage[]
}
type Solution = number[] //2-D array compressed into 1-D

export const OPS: Op[] = ['=', '+', '-', '*', '/']

const operationType = new sb.EnumType<Op>({
	type: new sb.CharType as sb.Type<Op>,
	values: OPS
})
const boxType = new sb.TupleType({
	type: new sb.FlexUnsignedIntType,
	length: 2
}) as any as sb.Type<Box>
const cageType = new sb.StructType<Cage>({
	op: operationType,
	val: new sb.FlexUnsignedIntType,
	boxes: new sb.ArrayType(boxType)
})
export const puzzleType = new sb.StructType<Puzzle>({
	max: new sb.FlexUnsignedIntType,
	cages: new sb.ArrayType(cageType)
})
export const solutionType: sb.Type<Solution> = new sb.ArrayType(
	new sb.FlexUnsignedIntType
)