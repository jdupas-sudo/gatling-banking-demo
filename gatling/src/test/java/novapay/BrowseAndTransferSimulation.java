package novapay;

import static io.gatling.javaapi.core.CoreDsl.*;

import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;
import novapay.groups.BrowseChain;
import novapay.groups.LoginChain;
import novapay.groups.TransferChain;
import novapay.config.Config;

/**
 * Full user journey: Login -> Dashboard -> Browse account -> Transfer money ->
 * Verify transfer.
 *
 * <p>
 * Simulates a realistic frontend user session with think times. Great for
 * Gatling Studio recording demos.
 *
 * <p>
 * Usage: mvn gatling:test
 * -Dgatling.simulationClass=novapay.BrowseAndTransferSimulation -Dusers=5
 * -Dduration=60
 */
public class BrowseAndTransferSimulation extends Simulation {

    private final ScenarioBuilder scenario = scenario("Browse and Transfer")
            .exitBlockOnFail()
            .on(
                    // Step 1: Login
                    exec(LoginChain.login())
                            .pause(Config.THINK_MIN, Config.THINK_MAX)

                            // Step 2: View dashboard
                            .exec(BrowseChain.viewDashboard())
                            .pause(Config.THINK_MIN, Config.THINK_MAX)

                            // Step 3: Browse account transactions with pagination
                            .exec(BrowseChain.browseAccount())
                            .pause(Config.THINK_MIN, Config.THINK_MAX)

                            // Step 4: View monthly statements
                            .exec(BrowseChain.viewStatements())
                            .pause(Config.THINK_LONG_MIN, Config.THINK_LONG_MAX)

                            // Step 5: Execute a transfer
                            .exec(TransferChain.executeTransfer()));

    {
        setUp(
                scenario.injectOpen(
                        rampUsers(Config.USERS).during(Config.DURATION)))
                .protocols(Config.HTTP_PROTOCOL)
                .assertions(
                        global().responseTime().percentile(95.0).lt(800),
                        global().failedRequests().percent().lt(5.0));
    }
}
