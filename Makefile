# Norrbank corporate onboarding estate.
#
# Every target here is what CI runs. If a target passes locally it passes in the pipeline;
# if it does not, the pipeline is the one that is right.

SHELL := /usr/bin/env bash
MVN := ./mvnw -B
WORKSPACE := rm-workspace

.PHONY: all build test lint clean run-core run-workspace screening-run registry-import check-java

all: build test lint

check-java:
	@if [ -z "$$JAVA_HOME" ] && ! command -v java >/dev/null 2>&1; then \
		echo "JAVA_HOME is not set and java is not on PATH."; \
		echo "This estate builds on a JDK 21. Point JAVA_HOME at one and try again."; \
		exit 1; \
	fi

build: check-java
	$(MVN) -DskipTests package
	cd $(WORKSPACE) && bun install --frozen-lockfile && bun run build
	@echo "Build succeeded"

test: check-java
	$(MVN) test
	bun test platform/
	cd $(WORKSPACE) && bun install --frozen-lockfile && bun run test

lint: check-java
	cd $(WORKSPACE) && bun install --frozen-lockfile && bun run lint
	@echo "Lint clean"

clean:
	$(MVN) clean
	rm -rf $(WORKSPACE)/dist $(WORKSPACE)/node_modules/.vite

# ── running things locally ───────────────────────────────────────────────────
# onboarding-core on the local profile uses an in-memory database, so nothing here
# touches a real environment.

run-core: check-java
	$(MVN) -pl onboarding-core spring-boot:run -Dspring-boot.run.profiles=local

run-workspace:
	cd $(WORKSPACE) && bun run dev

screening-run: check-java
	$(MVN) -q -pl screening-batch exec:java -Dexec.mainClass=se.norrbank.screening.job.ScreeningBatchJob

registry-import: check-java
	$(MVN) -q -pl registry-link exec:java -Dexec.mainClass=se.norrbank.registry.RegistryLinkImport
