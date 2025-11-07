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

## TODO Progress

### Song and Album Metrics

#### Song Metrics

- [x] **CA1**: Song metrics (plays, likes, shares)
  - Endpoints: `POST /song-metrics/:songId/plays`, `/likes`, `/shares`
  - Endpoint: `GET /song-metrics/:songId` to retrieve metrics
- [x] **CA3**: Real-time metrics updates via RabbitMQ

#### Album Metrics

- [x] **CA2**: Basic album metrics (likes, shares)
  - Endpoints: `POST /metrics/:albumId/like`, `/share`
  - Endpoint: `GET /metrics/:albumId` to retrieve metrics
- [x] **CA2**: Total album plays (sum of all songs in the album)

### User Metrics

- [x] User registration and activity tracking
  - **Registration**: `POST /metrics/users/:userId/registration` - User signup events
  - **Login**: `POST /metrics/users/:userId/login` - User authentication events
  - **Activity**: `POST /metrics/users/:userId/activity` - General user interactions (likes, follows, playlist creation, searches, saves, shares)
  - **Song Plays**: Automatically tracked via RabbitMQ when songs are played
- [x] **CA1**: Dashboard endpoints with key metrics
  - Endpoints: `GET /metrics/users/analytics/registrations`, `/active`, `/retention`
  - Core user analytics (registrations, active users, retention)
- [x] **CA2**: Metrics export (CSV/JSON)
  - Endpoint: `GET /metrics/users/export` with format parameter
  - Supports CSV and JSON export formats
- [x] **CA3**: Detailed user metrics breakdown
  - Endpoint: `GET /metrics/users/:userId/analytics/content` - Top songs and artists per user
  - Endpoint: `GET /metrics/users/:userId/analytics/patterns` - Activity patterns and listening behavior
  - User play tracking for content analytics

### Artist Metrics

- [x] **CA2**: Monthly listeners metric
  - Endpoint: `POST /metrics/artists` to create artist
  - Endpoint: `GET /metrics/artists/:artistId/monthly-listeners` to get monthly listeners
  - Endpoint: `GET /metrics/artists` to get all artists metrics
  - **Automatic integration**: When a song play is recorded with `POST /metrics/songs/:songId/plays` (requires `artistId` and `userId` in body), the artist listener is automatically tracked
  - Tracks unique listeners per day in a 30-day rolling window
  - Automatic cleanup of data older than 30 days
- [ ] **CA1**: Additional KPIs (followers, plays, saves, shares)
- [ ] **CA2**: Filters by period and region
- [ ] **CA3**: Navigable breakdowns
- [ ] **CA4**: Update timestamp and data freshness indicators
- [ ] **CA5**: Export functionality (CSV/Excel)

### Infrastructure & Cross-cutting Concerns

- [ ] Timestamp tracking for last update
- [ ] Period-based filtering (daily, weekly, monthly, custom range)
- [ ] Region/country-based filtering
- [ ] Song ↔ Album relationship entity
- [ ] Aggregation and analytics queries
- [ ] Logger integration (New Relic or similar) - logs must be stored and accessible at any time
