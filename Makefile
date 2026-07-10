.PHONY: dev migrate seed test build down ps log

dev:
	docker-compose up --build

down:
	docker-compose down

ps:
	docker-compose ps

log:
	docker-compose logs -f

migrate:
	docker-compose exec backend npx prisma migrate dev --name init

seed:
	docker-compose exec backend npx prisma db seed

test:
	docker-compose exec backend npm run test
	docker-compose exec frontend npm run test
