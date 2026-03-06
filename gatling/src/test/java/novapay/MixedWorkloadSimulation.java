package novapay;

import static io.gatling.javaapi.core.CoreDsl.*;

import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;
import novapay.groups.BrowseChain;
import novapay.groups.LoginChain;
import novapay.groups.ProfileChain;
import novapay.groups.TransferChain;
import novapay.config.Config;

/**
 * Realistic production traffic mix with weighted scenarios.
 *
 * <ul>
 * <li>50% Browsers: Login -> Dashboard -> Browse transactions
 * <li>30% Transferors: Login -> View accounts -> Make transfer
 * <li>20% Profile Managers: Login -> View/update profile -> Notifications
 * </ul>
 *
 * <p>
 * Usage: mvn gatling:test
 * -Dgatling.simulationClass=novapay.MixedWorkloadSimulation -Dusers=20
 * -Dduration=120
 */
public class MixedWorkloadSimulation extends Simulation {

        private final ScenarioBuilder scenario = scenario("Mixed Workload")
                        .exitBlockOnFail()
                        .on(
                                        exec(LoginChain.login())
                                                        .pause(Config.THINK_MIN, Config.THINK_MAX)
                                                        .randomSwitch()
                                                        .on(
                                                                        percent(50.0)
                                                                                        .then(
                                                                                                        exec(BrowseChain.viewDashboard())
                                                                                                                        .pause(
                                                                                                                                        Config.THINK_MIN,
                                                                                                                                        Config.THINK_MAX)
                                                                                                                        .exec(BrowseChain
                                                                                                                                        .browseWithFilter())),
                                                                        percent(30.0)
                                                                                        .then(exec(TransferChain
                                                                                                        .executeTransfer())),
                                                                        percent(20.0)
                                                                                        .then(exec(ProfileChain
                                                                                                        .manageProfile()))));

        {
                setUp(
                                scenario.injectOpen(
                                                rampUsers(Config.USERS).during(Config.DURATION)))
                                .protocols(Config.HTTP_PROTOCOL)
                                .assertions(
                                                global().responseTime().percentile(95.0).lt(5000),
                                                global().failedRequests().percent().lt(10.0));
        }
}
