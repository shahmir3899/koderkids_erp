import React, { useState } from "react";
import { Container, Card, Form, Button, Alert, InputGroup } from "react-bootstrap";
import { FaUser, FaEnvelope, FaLock, FaUserCog } from "react-icons/fa";

// Design Constants
import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    TRANSITIONS,
    MIXINS,
    TOUCH_TARGETS,
} from "../utils/designConstants";
import { useResponsive } from "../hooks/useResponsive";

function RegisterPage() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "Student",
    });

    const [message, setMessage] = useState("");
    const { isMobile } = useResponsive();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(""); // Clear any previous messages

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("Registration successful! Please log in.");
            } else {
                setMessage(`Error: ${data.error || "Registration failed"}`);
            }
        } catch (error) {
            setMessage("Network error. Try again.");
        }
    };

    const styles = getStyles(isMobile);

    return (
        <Container className="d-flex align-items-center justify-content-center" style={styles.container}>
            <div className="w-100" style={styles.wrapper}>
                <Card style={styles.card}>
                    <Card.Body style={styles.cardBody}>
                        <h2 style={styles.title}>User Registration</h2>
                        {message && (
                            <Alert variant={message.includes("successful") ? "success" : "danger"} className="mb-4">
                                {message}
                            </Alert>
                        )}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group controlId="username" className="mb-3">
                                <Form.Label style={{ color: COLORS.text.whiteMedium }}>Username</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={styles.inputGroupText}><FaUser /></InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        aria-label="Username"
                                        style={styles.formControl}
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group controlId="email" className="mb-3">
                                <Form.Label style={{ color: COLORS.text.whiteMedium }}>Email</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={styles.inputGroupText}><FaEnvelope /></InputGroup.Text>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        aria-label="Email"
                                        style={styles.formControl}
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group controlId="password" className="mb-3">
                                <Form.Label style={{ color: COLORS.text.whiteMedium }}>Password</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={styles.inputGroupText}><FaLock /></InputGroup.Text>
                                    <Form.Control
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        aria-label="Password"
                                        style={styles.formControl}
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group controlId="role" className="mb-4">
                                <Form.Label style={{ color: COLORS.text.whiteMedium }}>Role</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text style={styles.inputGroupText}><FaUserCog /></InputGroup.Text>
                                    <Form.Select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        aria-label="Role"
                                        style={styles.formControl}
                                    >
                                        <option value="Student">Student</option>
                                    </Form.Select>
                                </InputGroup>
                            </Form.Group>

                            <Button
                                type="submit"
                                className="w-100"
                                style={styles.submitButton}
                                onMouseEnter={(e) => (e.target.style.transform = "scale(1.02)")}
                                onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                            >
                                Register
                            </Button>
                        </Form>
                        <p style={styles.loginLink}>
                            Already have an account? <a href="/login" style={styles.loginLinkAnchor}>Log in</a>
                        </p>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
}

// ============================================
// STYLES (using design constants with glassmorphism)
// ============================================
const getStyles = (isMobile) => ({
    container: {
        minHeight: "100vh",
        background: COLORS.background.gradient,
        padding: isMobile ? SPACING.lg : 0,
    },
    wrapper: {
        maxWidth: isMobile ? "100%" : "400px",
        width: "100%",
    },
    card: {
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
    },
    cardBody: {
        padding: isMobile ? SPACING.lg : SPACING.xl,
    },
    title: {
        textAlign: 'center',
        marginBottom: SPACING.lg,
        fontWeight: 700,
        color: COLORS.text.white,
        fontSize: isMobile ? '1.5rem' : '1.75rem',
    },
    inputGroupText: {
        ...MIXINS.glassmorphicSubtle,
        color: COLORS.text.whiteSubtle,
        border: `1px solid ${COLORS.border.whiteTransparent}`,
        minHeight: TOUCH_TARGETS.minimum,
        display: 'flex',
        alignItems: 'center',
    },
    formControl: {
        minHeight: TOUCH_TARGETS.minimum,
        fontSize: '16px', // Prevents iOS zoom
    },
    submitButton: {
        background: `linear-gradient(to right, ${COLORS.primary}, ${COLORS.primaryDark})`,
        border: "none",
        transition: TRANSITIONS.normal,
        borderRadius: BORDER_RADIUS.md,
        boxShadow: '0 4px 15px rgba(176, 97, 206, 0.4)',
        minHeight: TOUCH_TARGETS.large,
        fontSize: '1rem',
    },
    loginLink: {
        marginTop: SPACING.lg,
        textAlign: 'center',
        color: COLORS.text.whiteMedium,
    },
    loginLinkAnchor: {
        color: COLORS.text.white,
        textDecoration: 'none',
        fontWeight: 600,
        padding: `${SPACING.sm} ${SPACING.md}`,
        display: 'inline-block',
        minHeight: TOUCH_TARGETS.minimum,
    },
});

export default RegisterPage;