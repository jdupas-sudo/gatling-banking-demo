package novapay.endpoints;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import io.gatling.javaapi.http.HttpRequestActionBuilder;
import novapay.config.Keys;

public final class TransferEndpoints {

  public static HttpRequestActionBuilder createTransfer() {
    return http("Create Transfer")
        .post("/api/transfers")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .body(
            StringBody(
                "{\"fromAccountId\": \"#{"
                    + Keys.ACCOUNT_ID
                    + "}\", \"toAccountId\": \"#{"
                    + Keys.SECOND_ACCOUNT_ID
                    + "}\", \"amount\": #{"
                    + Keys.TRANSFER_AMOUNT
                    + "}, \"description\": \"Gatling load test\"}"))
        .check(status().is(201))
        .check(jmesPath("transfer.status").is("completed"));
  }

  public static HttpRequestActionBuilder listTransfers() {
    return http("List Transfers")
        .get("/api/transfers")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200));
  }

  private TransferEndpoints() {}
}
