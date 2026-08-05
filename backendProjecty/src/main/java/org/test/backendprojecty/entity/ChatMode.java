package org.test.backendprojecty.entity;

public enum ChatMode {
    /** Free text at any time, including during a focus block. */
    OPEN,
    /** Only emoji reactions during a focus block; free text on break. */
    EMOJI_ONLY_FOCUS,
    /** No chat at all during a focus block; free text on break. */
    CLOSED_FOCUS
}
