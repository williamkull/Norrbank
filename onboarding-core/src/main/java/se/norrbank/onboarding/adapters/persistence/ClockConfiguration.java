package se.norrbank.onboarding.adapters.persistence;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * All timestamps in this service are UTC. Nothing constructs an Instant from the platform
 * default zone; everything takes this clock.
 */
@Configuration
public class ClockConfiguration {

    @Bean
    public Clock utcClock() {
        return Clock.systemUTC();
    }
}
