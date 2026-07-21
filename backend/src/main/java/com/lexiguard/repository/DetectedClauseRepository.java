package com.lexiguard.repository;

import com.lexiguard.entity.DetectedClause;
import com.lexiguard.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DetectedClauseRepository extends JpaRepository<DetectedClause, Long> {
    List<DetectedClause> findByDocument(Document document);
    void deleteByDocument(Document document);
}
