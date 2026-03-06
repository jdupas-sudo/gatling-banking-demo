package gatlingbank.endpoints;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import io.gatling.javaapi.http.HttpRequestActionBuilder;
import gatlingbank.config.Keys;

public final class AuthEndpoints {

  public static HttpRequestActionBuilder login() {
    return http("Login")
        .post("/api/auth/login")
        .body(
            StringBody(
                "{\"email\": \"#{email}\", \"password\": \"#{password}\"}"))
        .check(status().is(200))
        .check(jmesPath("token").saveAs(Keys.TOKEN))
        .check(jmesPath("user.id").saveAs(Keys.USER_ID))
        .check(jmesPath("user.firstName").saveAs(Keys.FIRST_NAME));
  }

  public static HttpRequestActionBuilder register(
      String email, String password, String firstName, String lastName) {
    return http("Register")
        .post("/api/auth/register")
        .body(
            StringBody(
                "{\"email\": \""
                    + email
                    + "\", \"password\": \""
                    + password
                    + "\", \"firstName\": \""
                    + firstName
                    + "\", \"lastName\": \""
                    + lastName
                    + "\"}"))
        .check(status().is(201))
        .check(jmesPath("token").saveAs(Keys.TOKEN));
  }

  private AuthEndpoints() {}
}
