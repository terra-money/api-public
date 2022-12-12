# Terra API

## Modules

- Collector
  - Collects historical data from LCD and sotres into the database
    - Reward Collector
- Rest API Server
  - Gathers data from database, FCD and LCD
  - Serves data via RESTFul API
    - Chart
    - Validator

## Installation

API requires PostgreSQL as a backend database and TypeORM as an ORM.

```bash
$ yarn
```

## Running Collector

```bash
# all collector
yarn run collector-all

# reward collector only
yarn run collector-reward
```

## Running API Server

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```
