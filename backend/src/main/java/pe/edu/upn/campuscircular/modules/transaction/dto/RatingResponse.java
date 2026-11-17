package pe.edu.upn.campuscircular.modules.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RatingResponse(
    Long idCalificacion,
    Long idTransaccion,
    Long idEmisor,
    Long idReceptor,
    Integer score,
    String comment,
    BigDecimal receptorReputacionPromedio,
    LocalDateTime fechaCreacion
) {}
