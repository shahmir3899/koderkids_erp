import React, { useState } from "react";
import { Container, Card, Form, Button, Alert, InputGroup } from "react-bootstrap";
import { FaUser, FaEnvelope, FaLock, FaUserCog } from "react-icons/fa";

function RegisterPage() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "Student",
    });

    const [message, setMessage] = useState("");

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

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
            <div className="w-100" style={{ maxWidth: "400px" }}>
                <Card className="shadow-lg border-0 rounded-lg">
                    <Card.Body className="p-4">
                        <h2 className="text-center mb-4 font-weight-bold">User Registration</h2>
                        {message && (
                            <Alert variant={message.includes("successful") ? "success" : "danger"} className="mb-4">
                                {message}
                            </Alert>
                        )}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group controlId="username" className="mb-3">
                                <Form.Label>Username</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light"><FaUser /></InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        aria-label="Username"
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group controlId="email" className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light"><FaEnvelope /></InputGroup.Text>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        aria-label="Email"
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group controlId="password" className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light"><FaLock /></InputGroup.Text>
                                    <Form.Control
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        aria-label="Password"
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group controlId="role" className="mb-4">
                                <Form.Label>Role</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light"><FaUserCog /></InputGroup.Text>
                                    <Form.Select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        aria-label="Role"
                                    >
                                        
                                        <option value="Student">Student</option>
                                    </Form.Select>
                                </InputGroup>
                            </Form.Group>

                            <Button
                                type="submit"
                                className="w-100"
                                style={{
                                    background: "linear-gradient(to right, #007bff, #0056b3)",
                                    border: "none",
                                    transition: "transform 0.2s ease-in-out",
                                }}
                                onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                                onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                            >
                                Register
                            </Button>
                        </Form>
                        <p className="mt-3 text-center text-muted">
                            Already have an account? <a href="/login" className="text-primary">Log in</a>
                        </p>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
}

export default RegisterPage;