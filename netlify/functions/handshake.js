exports.handler = async (event) => {
    const expectedPassword = process.env.PASSWORD_SECRET; // contrasenya simbòlica

    // Només acceptem POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed",
      };
    }

    const { password } = JSON.parse(event.body || "{}");

    if (password === expectedPassword) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Validació correcta" }),
      };
    }

    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Contrasenya incorrecta" }),
    };
  };