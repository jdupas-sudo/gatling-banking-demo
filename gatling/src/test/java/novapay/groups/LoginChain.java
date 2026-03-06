package novapay.groups;

import static io.gatling.javaapi.core.CoreDsl.*;

import io.gatling.javaapi.core.ChainBuilder;
import io.gatling.javaapi.core.FeederBuilder;
import novapay.endpoints.AuthEndpoints;

public final class LoginChain {

  private static final FeederBuilder<Object> USERS_FEEDER = jsonFile("data/users.json").circular();

  public static ChainBuilder login() {
    return feed(USERS_FEEDER).exec(AuthEndpoints.login());
  }

  private LoginChain() {
  }
}
