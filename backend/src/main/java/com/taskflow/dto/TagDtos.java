package com.taskflow.dto;

import com.taskflow.model.Tag;

public final class TagDtos {

    private TagDtos() {
    }

    public record TagDto(Long id, String title, String color) {
        public static TagDto of(Tag t) {
            return new TagDto(t.id, t.title, t.color);
        }
    }
}
