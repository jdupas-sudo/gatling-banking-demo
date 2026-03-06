package novapay.config;

import static io.gatling.javaapi.http.HttpDsl.*;

import io.gatling.javaapi.http.HttpProtocolBuilder;

public final class Config {

    public static final String BASE_URL = System.getProperty("baseUrl", "http://localhost:3000");

    // Think time ranges (seconds)
    public static final int THINK_MIN = 2;
    public static final int THINK_MAX = 5;
    public static final int THINK_LONG_MIN = 5;
    public static final int THINK_LONG_MAX = 10;

    // Injection defaults
    public static final int USERS = Integer.getInteger("users", 200);
    public static final int DURATION = Integer.getInteger("duration", 60);
    public static final int RATE = Integer.getInteger("rate", 5);

    public static final HttpProtocolBuilder HTTP_PROTOCOL = http.baseUrl(BASE_URL)
            .acceptHeader("application/json")
            .contentTypeHeader("application/json")
            .userAgentHeader(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                            + " (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
            .disableCaching();

    private Config() {
    }
}
