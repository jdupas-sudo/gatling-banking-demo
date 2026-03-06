package novapay.grroups;

import static io.gatling.javaapi.core.CoreDsl.*;

import io.gatling.javaapi.core.ChainBuilder;
import novapay.config.Config;
import novapay.config.Keys;
import novapay.endpoints.UserEndpoints;

public final class ProfileChain {

  /** View profile, update it, check notifications. */
  public static ChainBuilder manageProfile() {
    return exec(UserEndpoints.getProfile())
        .pause(Config.THINK_MIN, Config.THINK_MAX)
        .exec(UserEndpoints.updateProfile())
        .pause(Config.THINK_MIN, Config.THINK_MAX)
        .exec(UserEndpoints.getNotifications())
        .doIf(session -> session.contains(Keys.NOTIFICATION_ID))
        .then(
            pause(1, 2)
                .exec(UserEndpoints.markNotificationRead()));
  }

  /** Read-only profile view with beneficiaries. */
  public static ChainBuilder viewProfile() {
    return exec(UserEndpoints.getProfile())
        .pause(Config.THINK_MIN, Config.THINK_MAX)
        .exec(UserEndpoints.getBeneficiaries());
  }

  private ProfileChain() {
  }
}
