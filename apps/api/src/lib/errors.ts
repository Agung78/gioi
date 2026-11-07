import { FastifyError } from 'fastify'

export class AppError extends Error implements FastifyError {
	statusCode: number
	code: string
	constructor(statusCode: number, message: string, code = 'ERR_GIOI_API') {
		super(message)
		this.statusCode = statusCode
		this.code = code
		Error.captureStackTrace(this, AppError)
	}
}

export function notFound(message = 'not found') {
	return new AppError(404, message, 'ERR_NOT_FOUND')
}

export function conflict(message = 'conflict') {
	return new AppError(409, message, 'ERR_CONFLICT')
}

export function unprocessable(message = 'unprocessable') {
	return new AppError(422, message, 'ERR_UNPROCESSABLE')
}

export function unauthorized(message = 'unauthorized') {
	return new AppError(401, message, 'ERR_UNAUTHORIZED')
}

export function forbidden(message = 'forbidden') {
	return new AppError(403, message, 'ERR_FORBIDDEN')
}
