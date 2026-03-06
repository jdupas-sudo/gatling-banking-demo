package gatlingbank.groups;

import static io.gatling.javaapi.core.CoreDsl.*;

import io.gatling.javaapi.core.ChainBuilder;
import gatlingbank.config.Config;
import gatlingbank.endpoints.AccountEndpoints;

public final class BrowseChain {

  /** Dashboard view: list all accounts. */
  public static ChainBuilder viewDashboard() {
    return exec(AccountEndpoints.listAccounts());
  }

  /** Browse a single account: detail + paginated transactions. */
  public static ChainBuilder browseAccount() {
    return exec(AccountEndpoints.getAccount())
        .pause(Config.THINK_MIN, Config.THINK_MAX)
        .exec(AccountEndpoints.getTransactions(1, 20))
        .pause(Config.THINK_MIN, Config.THINK_MAX)
        .exec(AccountEndpoints.getTransactions(2, 20));
  }

  /** Browse with filters (simulates user searching). */
  public static ChainBuilder browseWithFilter() {
    return exec(AccountEndpoints.getAccount())
        .pause(Config.THINK_MIN, Config.THINK_MAX)
        .exec(AccountEndpoints.getTransactions(1, 20))
        .pause(Config.THINK_MIN, Config.THINK_MAX)
        .exec(AccountEndpoints.getTransactionsFiltered("groceries"));
  }

  /** View monthly statements. */
  public static ChainBuilder viewStatements() {
    return exec(AccountEndpoints.getStatements());
  }

  private BrowseChain() {
  }
}
