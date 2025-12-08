# Melodía Metrics Service

<a href="https://github.com/melodia-grupo09/metrics/actions/workflows/github-actions.yml" target="_blank">
  <img src="https://github.com/melodia-grupo09/metrics/workflows/CI%2FCD%20Pipeline/badge.svg" alt="CI/CD Status" />
</a>
<a href="https://app.codecov.io/github/melodia-grupo09/metrics" target="_blank">
  <img src="https://codecov.io/github/melodia-grupo09/metrics/branch/master/graph/badge.svg?token=BQ641ZU5EK" alt="Coverage Status" />
</a>
<a href="https://nodejs.org" target="_blank">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js Version" />
</a>
<a href="https://nestjs.com" target="_blank">
  <img src="https://img.shields.io/badge/NestJS-11.0-E0234E.svg" alt="NestJS Version" />
</a>
<a href="https://www.typescriptlang.org" target="_blank">
  <img src="https://img.shields.io/badge/TypeScript-5.1-007ACC.svg" alt="TypeScript Version" />
</a>
<a href="https://www.mongodb.com" target="_blank">
  <img src="https://img.shields.io/badge/MongoDB-8.0-47A248.svg" alt="MongoDB Version" />
</a>
<a href="https://www.rabbitmq.com" target="_blank">
  <img src="https://img.shields.io/badge/RabbitMQ-4.1-FF6600.svg" alt="RabbitMQ Version" />
</a>

Metrics microservice built with [**NestJS**](https://nestjs.com/) for the Melodía platform.

## Live Deployment

The application is deployed on Heroku and accessible at: [https://melodia-metrics-e9ca6dea743b.herokuapp.com/](https://melodia-metrics-e9ca6dea743b.herokuapp.com/)

## Overview

This Metrics Service provides comprehensive analytics and tracking for the Melodía platform, offering:

- **Real-time Metrics Collection**: Track user interactions, song plays, likes, and shares
- **RabbitMQ Integration**: Asynchronous message processing for scalable metrics collection
- **MongoDB Storage**: Efficient storage and querying of metrics data
- **RESTful API**: Comprehensive endpoints for metrics retrieval and analysis

## Architecture

The metrics service follows a microservices architecture pattern with event-driven communication:

- **Metrics Collection Layer**: Captures user interactions and system events
- **RabbitMQ Integration**: Asynchronous message processing for scalable data ingestion
- **Data Storage Layer**: MongoDB for efficient metrics storage and querying

### RabbitMQ Message Routing

This project uses one queue with one exchange, with one topic and multiple routing keys, the benefits of this approach are:

- **Native RabbitMQ Routing**: Leverages RabbitMQ's built-in routing capabilities rather than application-level logic
- **Better Performance**: Message routing happens at the broker level, which is more efficient
- **Semantic Routing Keys**: Keys like `metrics.song.play` clearly express intent and message type

#### Routing Key Structure

Format: `metrics.<entity>.<action>`

##### Examples

- **Song metrics**: `metrics.song.play`, `metrics.song.like`, `metrics.song.share`
- **Album metrics**: `metrics.album.like`, `metrics.album.share`
- **User metrics**: `metrics.user.registration`, `metrics.user.activity`

## Getting Started

### Prerequisites

- Node.js (>=18.0.0)
- npm or yarn
- MongoDB
- RabbitMQ

### Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb://admin:admin@localhost:27017/metrics?authSource=admin
RABBITMQ_URL=amqp://localhost:5672
# Or for CloudAMQP
CLOUDAMQP_URL=...
```

### Installation

```bash
$ npm install
```

### Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

### Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Documentation

For comprehensive API documentation, including all endpoints, request/response schemas, and interactive testing, visit our Swagger documentation:

**[Interactive API Documentation](https://melodia-metrics-e9ca6dea743b.herokuapp.com/api)**

## Code Coverage

Comprehensive test coverage tracked automatically via Codecov:

[![Test Coverage](https://codecov.io/github/melodia-grupo09/metrics/branch/master/graph/badge.svg?token=BQ641ZU5EK)](https://codecov.io/github/melodia-grupo09/metrics)

**[View Detailed Coverage Report & Interactive Graphs](https://app.codecov.io/github/melodia-grupo09/metrics)**

<h3>Graph</h3>
<div align="center">
  
  <a href="https://app.codecov.io/github/melodia-grupo09/metrics" target="_blank">
    <img src="https://codecov.io/github/melodia-grupo09/metrics/graphs/sunburst.svg?token=BQ641ZU5EK" alt="Coverage Sunburst" width="400" />
  </a>
  
</div>

## Dependencies

### Core Framework

- **NestJS**: Modern Node.js framework with TypeScript support
- **MongoDB**: NoSQL database for scalable metrics storage
- **RabbitMQ**: Message broker for asynchronous event processing
- **Mongoose**: MongoDB object modeling for Node.js

### Development & Testing

- **Jest**: Testing framework with mocking capabilities
- **ESLint**: Code quality and style enforcement
- **TypeScript**: Type safety and enhanced developer experience
