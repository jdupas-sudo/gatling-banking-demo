package novapay.endpoints;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import io.gatling.javaapi.http.HttpRequestActionBuilder;
import novapay.config.Keys;

public final class AccountEndpoints {

  public static HttpRequestActionBuilder listAccounts() {
    return http("List Accounts")
        .get("/api/accounts")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200))
        .check(jmesPath("accounts[0].id").saveAs(Keys.ACCOUNT_ID))
        .check(
            jmesPath("accounts[1].id")
                .optional()
                .saveAs(Keys.SECOND_ACCOUNT_ID));
  }

  public static HttpRequestActionBuilder getAccount() {
    return http("Get Account Detail")
        .get("/api/accounts/#{" + Keys.ACCOUNT_ID + "}")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200));
  }

  public static HttpRequestActionBuilder getTransactions(int page, int limit) {
    return http("Get Transactions (page " + page + ")")
        .get(
            "/api/accounts/#{" + Keys.ACCOUNT_ID + "}/transactions"
                + "?page=" + page + "&limit=" + limit)
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200));
  }

  public static HttpRequestActionBuilder getTransactionsFiltered(
      String category) {
    return http("Get Transactions (filter: " + category + ")")
        .get(
            "/api/accounts/#{" + Keys.ACCOUNT_ID + "}/transactions"
                + "?category=" + category + "&limit=20")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200));
  }

  public static HttpRequestActionBuilder getStatements() {
    return http("Get Statements")
        .get("/api/accounts/#{" + Keys.ACCOUNT_ID + "}/statements")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200));
  }

  private AccountEndpoints() {}
}
