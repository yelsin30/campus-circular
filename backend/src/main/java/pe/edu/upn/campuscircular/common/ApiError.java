
package pe.edu.upn.campuscircular.common;

import java.time.Instant;
import java.util.List;

public record ApiError(
    Instant timestamp,
    int status,
    String error,
    String message,
    String path,
    List<ErrorDetail> details
) {
    public record ErrorDetail(
        String field,
        String issue
    ) {}
}
