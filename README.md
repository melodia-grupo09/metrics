# Metrics Microservice

<p align="center">
  <a href="https://github.com/melodia-grupo09/metrics/actions/workflows/github-actions.yml" target="_blank">
    <img src="https://github.com/melodia-grupo09/metrics/workflows/CI%2FCD%20Pipeline/badge.svg" alt="CI/CD Status" />
  </a>
  <a href="https://app.codecov.io/github/melodia-grupo09/metrics" target="_blank">
    <img src="https://codecov.io/github/melodia-grupo09/metrics/branch/master/graph/badge.svg?token=BQ641ZU5EK" alt="Coverage Status" />
  </a>
  <a href="https://nodejs.org" target="_blank">
    <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js Version" />
  </a>
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://img.shields.io/badge/nestjs-11.0-red.svg" alt="NestJS Version" />
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank">
    <img src="https://img.shields.io/badge/typescript-5.1-blue.svg" alt="TypeScript Version" />
  </a>
  <a href="https://www.mongodb.com/" target="_blank">
    <img src="https://img.shields.io/badge/mongodb-8.0-green.svg" alt="MongoDB Version" />
  </a>
  <a href="https://www.rabbitmq.com/" target="_blank">
    <img src="https://img.shields.io/badge/rabbitmq-4.1-orange.svg" alt="RabbitMQ Version" />
  </a>
</p>

## Description

<p>Metrics microservice for the Melodía platform built with NestJS, RabbitMQ and MongoDB.</p>

## 📊 Coverage y Métricas de Calidad

### Code Coverage

- ![Coverage](https://codecov.io/github/melodia-grupo09/metrics/branch/master/graph/badge.svg?token=BQ641ZU5EK)
- [Ver reporte detallado](https://app.codecov.io/github/melodia-grupo09/metrics)

<div align="center">
  <img src="https://codecov.io/github/melodia-grupo09/metrics/graphs/sunburst.svg?token=BQ641ZU5EK" alt="Codecov Sunburst" width="400"/>
</div>


## RabbitMQ Architecture

#### 1. Architecture

This project uses one queue with one exchange, with one topic and multiple routing keys, the benefits of this approach are:

- **Native RabbitMQ Routing**: Leverages RabbitMQ's built-in routing capabilities rather than application-level logic
- **Better Performance**: Message routing happens at the broker level, which is more efficient
- **Semantic Routing Keys**: Keys like `metrics.song.play` clearly express intent and message type

#### 2. **Routing Key Structure**

Format: `metrics.<entity>.<action>`

##### Examples

- **Song metrics**: `metrics.song.play`, `metrics.song.like`, `metrics.song.share`
- **Album metrics**: `metrics.album.like`, `metrics.album.share`
- **User metrics**: `metrics.user.registration`, `metrics.user.activity`

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
- [ ] **CA1**: Dashboard endpoints with key metrics
- [ ] **CA2**: Metrics export (CSV/Excel)
- [ ] **CA3**: Detailed user metrics breakdown

### Artist Metrics

- [ ] **CA1**: Main KPIs (monthly listeners, followers, plays, saves, shares)
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
