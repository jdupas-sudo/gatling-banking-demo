package novapay;

import static io.gatling.javaapi.core.CoreDsl.*;

import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;
import novapay.groups.BrowseChain;
import novapay.groups.LoginChain;
import novapay.config.Config;

/**
 * Smoke test: Login -> List accounts -> Browse transactions.
 *
 * <p>
 * Validates the test infrastructure and basic API connectivity.
 *
 * <p>
 * Usage: mvn gatling:test -Dgatling.simulationClass=novapay.BasicSimulation
 */
public class BasicSimulation extends Simulation {

  private final ScenarioBuilder scenario = scenario("Basic Browse")
      .exitBlockOnFail()
      .on(
          exec(LoginChain.login())
              .pause(Config.THINK_MIN, Config.THINK_MAX)
              .exec(BrowseChain.viewDashboard())
              .pause(Config.THINK_MIN, Config.THINK_MAX)
              .exec(BrowseChain.browseAccount()));

  {
    setUp(scenario.injectOpen(atOnceUsers(Config.USERS)))
        .protocols(Config.HTTP_PROTOCOL)
        .assertions(global().failedRequests().count().is(0L));
  }
}
