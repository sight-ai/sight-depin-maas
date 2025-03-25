import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class PlainTextToJsonMiddleware implements NestMiddleware {

  use(req: Request, res: Response, next: NextFunction) {
    // Check if the Content-Type is 'text/plain', if so, change it into application/json
    if (req.is('text/plain')) {
      console.log("Middleware modify content-type from text/plain to application/json");
      try {
        // Attempt to parse the plain text body as JSON
        // Replace the request body with the parsed JSON object
        if(typeof req.body === "string") {
          req.body = JSON.parse(req.body);
          req.headers['content-type'] = 'application/json; charset=utf-8';
        }
      } catch (error) {
        // If the body cannot be parsed, return a 400 Bad Request error
        return res.status(400).json({ message: 'Invalid plain text data, unable to parse as JSON' });
      }
    } else {
      // Do nothing
    }

    // Continue to the next middleware or route handler
    next();
  }
}
