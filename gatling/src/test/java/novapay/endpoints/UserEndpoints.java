package novapay.endpoints;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import io.gatling.javaapi.http.HttpRequestActionBuilder;
import novapay.config.Keys;

public final class UserEndpoints {

  public static HttpRequestActionBuilder getProfile() {
    return http("Get Profile")
        .get("/api/user/profile")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200));
  }

  public static HttpRequestActionBuilder updateProfile() {
    return http("Update Profile")
        .put("/api/user/profile")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .body(
            StringBody(
                "{\"firstName\": \"#{" + Keys.FIRST_NAME + "}\","
                    + " \"phone\": \"+1-555-0199\"}"))
        .check(status().is(200));
  }

  public static HttpRequestActionBuilder getNotifications() {
    return http("Get Notifications")
        .get("/api/user/notifications")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200))
        .check(
            jmesPath("notifications[0].id")
                .optional()
                .saveAs(Keys.NOTIFICATION_ID));
  }

  public static HttpRequestActionBuilder markNotificationRead() {
    return http("Mark Notification Read")
        .put("/api/user/notifications/#{" + Keys.NOTIFICATION_ID + "}/read")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200));
  }

  public static HttpRequestActionBuilder getBeneficiaries() {
    return http("Get Beneficiaries")
        .get("/api/user/beneficiaries")
        .header("Authorization", "Bearer #{" + Keys.TOKEN + "}")
        .check(status().is(200));
  }

  private UserEndpoints() {}
}
