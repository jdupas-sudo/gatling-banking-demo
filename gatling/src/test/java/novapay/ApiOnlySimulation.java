package novapay;

import static io.gatling.javaapi.core.CoreDsl.*;

import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;
import novapay.groups.BrowseChain;
import novapay.groups.LoginChain;
import novapay.groups.TransferChain;
import novapay.config.Config;

/**
 * Direct API load testing with multiple concurrent scenarios.
 *
 * <p>
 * Tests raw API throughput without simulating browser behavior. Three
 * parallel workloads:
 *
 * <ul>
 * <li>Auth: Repeated login calls
 * <li>Read: Account listing + transaction queries
 * <li>Write: Transfer execution (includes vendor latency)
 * </ul>
 *
 * <p>
 * Usage: mvn gatling:test
 * -Dgatling.simulationClass=novapay.ApiOnlySimulation -Drate=10 -Dduration=60
 */
public class ApiOnlySimulation extends Simulation {

        private final ScenarioBuilder authScenario = scenario("API - Auth")
                        .exec(LoginChain.login())
                        .pause(1);

        private final ScenarioBuilder readScenario = scenario("API - Read")
                        .exitBlockOnFail()
                        .on(
                                        exec(LoginChain.login())
                                                        .exec(BrowseChain.viewDashboard())
                                                        .pause(1)
                                                        .exec(BrowseChain.browseAccount()));

        private final ScenarioBuilder writeScenario = scenario("API - Write")
                        .exitBlockOnFail()
                        .on(
                                        exec(LoginChain.login())
                                                        .exec(TransferChain.executeTransfer()));

        {
                setUp(
                                authScenario.injectOpen(
                                                constantUsersPerSec(Config.RATE).during(Config.DURATION)),
                                readScenario.injectOpen(
                                                constantUsersPerSec(Config.RATE / 2.0).during(Config.DURATION)),
                                writeScenario.injectOpen(
                                                constantUsersPerSec(Config.RATE / 5.0).during(Config.DURATION)))
                                .protocols(Config.HTTP_PROTOCOL)
                                .assertions(
                                                global().responseTime().percentile(99.0).lt(10000),
                                                global().failedRequests().percent().lt(15.0));
        }
}
