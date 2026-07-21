package com.lexiguard.repository;

import com.lexiguard.entity.Document;
import com.lexiguard.entity.DocumentPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentPageRepository extends JpaRepository<DocumentPage, Long> {
    List<DocumentPage> findByDocumentOrderByPageNumberAsc(Document document);
    void deleteByDocument(Document document);
}
