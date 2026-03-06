package novapay.grroups;

import static io.gatling.javaapi.core.CoreDsl.*;

import io.gatling.javaapi.core.ChainBuilder;
import java.util.concurrent.ThreadLocalRandom;
import novapay.config.Config;
import novapay.config.Keys;
import novapay.endpoints.AccountEndpoints;
import novapay.endpoints.TransferEndpoints;

public final class TransferChain {

  /**
   * Full transfer flow: list accounts, pick a random amount, execute transfer,
   * then verify by listing transfers.
   *
   * <p>
   * Requires at least 2 accounts (secondAccountId must exist in session).
   */
  public static ChainBuilder executeTransfer() {
    return exec(AccountEndpoints.listAccounts())
        .pause(Config.THINK_MIN, Config.THINK_MAX)
        // Set a random transfer amount between $10 and $200
        .exec(
            session -> {
              double amount = Math.round(
                  ThreadLocalRandom.current().nextDouble(10.0, 200.0)
                      * 100.0)
                  / 100.0;
              return session.set(Keys.TRANSFER_AMOUNT, amount);
            })
        // Only proceed if user has at least 2 accounts
        .doIf(session -> session.contains(Keys.SECOND_ACCOUNT_ID))
        .then(
            pause(Config.THINK_LONG_MIN, Config.THINK_LONG_MAX)
                .exec(TransferEndpoints.createTransfer())
                .pause(Config.THINK_MIN, Config.THINK_MAX)
                .exec(TransferEndpoints.listTransfers()));
  }

  private TransferChain() {
  }
}
