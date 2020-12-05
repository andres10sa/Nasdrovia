const router = require("express").Router();
const { Op } = require("sequelize");
const { Carrito, LineaDeOrden, Usuario, Producto } = require("../db.js");
const { isAuthenticated, isAuthenticatedAndAdmin } = require("./middlewares");
const mailgun = require("mailgun-js");
const DOMAIN = "sandbox396137037a674502865965b3ae0e95d0.mailgun.org";
const mg = mailgun({
  apiKey: "4e1388898d6578304533bdde9d4cdca0-53c13666-92f2a20e",
  domain: DOMAIN,
});
/* -------------------Rutas Orden de compra------------------ */




//Ruta para obtener lineas de orden de un carrito
router.get("/:id", (req, res) => {
  let id = req.params.id;

  Carrito.findByPk(id, {
    include: [{ model: LineaDeOrden }],
  }) //Traemos los datos del producto, precio, cantidad, etc
    .then((respuesta) => {
      if (respuesta) return res.status(200).json(respuesta);
      else res.status(404).json({ error: "Orden no encontrada" });
    })
    .catch((error) => res.status(400).json(error));
});

//Rutas para traer todas las lineas de ordenes
router.get("/", (req, res) => {
  let estado = req.query.estado;

  Carrito.findAll({
    include: [{ model: LineaDeOrden }],
    where: estado ? { estado: { [Op.iLike]: `%${estado}%` } } : {},
  }).then((r) => {
    if (r.length <= 0) {
      res.status(400).send("no existe su petición");
    } else {
      res.status(200).send(r);
    }
  });
});

//Agregar productos al carro
router.post("/:idCarro/cart", (req, res) => {
  let lista = [];
  id = req.params.idCarro;
  let productos = req.body.productos;
  console.log(productos);
  console.log(typeof productos);
  if (typeof productos !== "object") {
    productos = JSON.parse(req.body.productos);
  }
  console.log(typeof productos);
  //Llenamos la lista de productos
  productos.list.forEach((element) => {
    let producto = {
      productoId: element.productoId,
      carritoId: id,
      cantidad: element.cantidad,
      precio: element.precio,
    };
    lista.push(producto);
  });
  let listaAnterior = LineaDeOrden.findAll({ where: { carritoId: id } });
  console.log(listaAnterior);
  if (listaAnterior) {
    LineaDeOrden.destroy({ where: { carritoId: id } });
  }

  //Creamos las lineasDeOrden asociadas al carrito
  LineaDeOrden.bulkCreate(lista)
  .then(
    Carrito.findOne({
      where: { id: id },
      include: LineaDeOrden,
    }).then((carrito) => res.json(carrito))
  );
});

//Editar las cantidad con el id del carro y el id producto la cantidad
router.put("/:id/cart", async (req, res) => {
  let idCarrito = req.params.id;
  let { producto, cantidad, precio } = req.body;
  if (producto || cantidad || precio) {
    LineaDeOrden.findOne({ where: { carritoId: idCarrito } })
      .then((existe) => {
        !!existe
          ? LineaDeOrden.update(
              { producto: producto, cantidad: cantidad, precio: precio },
              { where: { carritoId: idCarrito } }
            ).then(res.status(200).json({ OK: "Actualizado correctamente" }))
          : res.status(400).json({ Error: "Linea de orden no existente" });
      })
      .catch((err) => res.status(400).json({ Error: err }));
  } else {
    res.status(400).json({ Error: "Envia almenos un parametro" });
  }
});

//Borrar un producto del carrito
router.delete("/borrar/:idCarro", async (req, res) => {
  const id = req.params.idCarro;
  let producto = req.body.producto;
  let deleting = await LineaDeOrden.destroy({
    where: { productoId: producto },
  });
  let compras = await Carrito.findOne({
    where: { id: id },
    include: LineaDeOrden,
  });
  res.status(200).json(compras);
});

router.put("/:id/cart/status", (req, res) => {
  let idCarrito = req.params.id;
  let { estado } = req.body;
  if (estado) {
    Carrito.findOne({ where: { id: idCarrito } })
      .then((existe) => {
        !!existe
          ? Carrito.update(
              { estado: estado },
              { where: { id: idCarrito } }
            ).then(res.status(200).json({ OK: "Actualizado correctamente" }))
          : res.status(204).json({ Error: "Linea de orden no existente" });
      })
      .catch((err) => res.status(400).json({ Error: err }));
  } else {
    res.status(204).json({ Error: "Envia almenos un parametro" });
  }
});

router.put("/:id/set-total", async (req, res) => {
  let idCarrito = req.params.id;
  let total = 0;
  let data = await Carrito.findOne({
    where: { id: idCarrito },
    include: LineaDeOrden,
  });
  if (data) {
    data.lineaDeOrdens.forEach((element) => {
      total += element.dataValues.precio;
    });
    Carrito.update({ total: total }, { where: { id: idCarrito } }).then(
      res.status(200).json({ OK: "Total seteado" })
    );
  } else {
    res.status(200).json({ Error: "Esa orden no existia" });
  }
});

router.post("/envio-confirmacion", async (req, res) => {
  console.log("------------------------------/envio-confirmacion--------------------")
  console.log(req.body)
  const { email } = req.body;
  let usuario = await Usuario.findOne({ where: { email: email } });
  if (!usuario) {
    return res.status(204).send("No hay usuarios registrados con ese email");
  }
  const data = {
    from: "Nasdrovia <support@nasdrovia.com>",
    to: email,
    subject: "Confirmación de Pedido",
    text: "Tu pedido se ha recibido correctamente",
    html: `<xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
    <title>Nasdrovia</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0 " />
    <meta name="format-detection" content="telephone=no"/>
    <!--[if !mso]><!-->
    <link href="https://fonts.googleapis.com/css?family=Lato:100,100i,300,300i,400,700,700i,900,900i" rel="stylesheet" />
    <!--<![endif]-->
    <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100% !important;
      -ms-text-size-adjust: 100% !important;
      -webkit-font-smoothing: antialiased !important;
    }
    img {
      border: 0 !important;
      outline: none !important;
    }
    p {
      Margin: 0px !important;
      Padding: 0px !important;
    }
    table {
      border-collapse: collapse;
      /* mso-table-lspace: 0px;
      mso-table-rspace: 0px; */
    }
    td, a, span {
      border-collapse: collapse;
      /* mso-line-height-rule: exactly; */
    }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Lobster&display=swap" rel="stylesheet">
    </head>
    <body class="em_body" style="margin:0px auto; padding:0px;" bgcolor="#015386">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" class="em_full_wrap" align="center"  bgcolor="#015386">
        <tr>
          <td align="center" valign="top"><table align="center" width="650" border="0" cellspacing="0" cellpadding="0" class="em_main_table" style="width:650px; table-layout:fixed;">
              <tr>
                <td align="center" valign="top" style="padding:0 25px;" class="em_aside10"><table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
                  <tr>
                    <td height="26" style="height:26px;" class="em_h20">&nbsp;</td>
                  </tr>
                
                  <tr>
                    <td height="28" style="height:28px;" class="em_h20"></td>
                  </tr>
                </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
    </table>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" class="em_full_wrap" align="center" bgcolor="#015386">
        <tr>
          <td align="center" valign="top"><table align="center" width="650" border="0" cellspacing="0" cellpadding="0" class="em_main_table" style="width:650px; table-layout:fixed; background-color:#563488;">
              <tr>
                <td align="center" valign="top" style="padding:0 25px; background-color:#015386;" bgcolor="#015386" class="em_aside10">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center" >
    
                  <tr>
                    <td class="em_blue em_font_22" align="center" valign="top" style="font-family: Arial, sans-serif; font-size: 26px; line-height: 29px; color:#264780; font-weight:bold;"></td>
                  </tr>
                  <tr>
                    <td height="22" class="em_h20" style="height:22px; font-size:0px; line-height:0px;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td align="center" height="22" class="em_h20" style="height:22px; font-size:0px; line-height:0px;"><img src="https://i.pinimg.com/564x/ac/de/80/acde80ebc88d4dda88b10f7697cef890.jpg"  width="250" height="250" align="center"></td>
                  </tr>
                  <tr>
                    <td height="22" class="em_h20" style="height:22px; font-size:0px; line-height:0px;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td valign="top" align="left" bgcolor="#f2effb" style="padding-left:25px; padding-right:35px; background-color:#015386;" class="em_aside10">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" align="left" >
                          <tr>
                            <td height="22" style="height:22px;" class="em_h20">&nbsp;</td>
                          </tr>
                          <tr>
                            <td class="em_blue em_center" align="center" valign="top" style="font-family: Arial, sans-serif; font-size: 40px; line-height: 24px; color:#ffffff; font-weight:bold;">¡Hola ${usuario.nombre}!</td>
                          </tr>
                           <tr>
                              <tr>
                    <td height="22" class="em_h20" style="height:22px; font-size:0px; line-height:0px;">&nbsp;</td>
                  </tr>
                            <td class="em_blue em_center" align="justify" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 28px; color:#ffffff; font-weight:bold;">Su pedido se ha recibido correctamente. Gracias por elegirnos</td>
                         
                          <tr>
                            <td height="16" style="height:16px; font-size:1px; line-height:1px;">&nbsp;</td>
                          </tr>
                          <tr>
                            <td height="16" style="height:16px; font-size:1px; line-height:1px;">&nbsp;</td>
                          </tr>
                          <tr>
                            <td align="rigth" valign="top">
                            <table width="140" border="0" cellspacing="0" cellpadding="0" align="center" style="width:140px;" class="em_wrapper" >
                              <tr>
                                <td valign="top" align="center">
                                  <table width="140" style="width:140px; background-color:#d30208; border-radius:4px;" border="0" cellspacing="0" cellpadding="0" align="rigth" bgcolor="#d30208">
                              <tr>
                                <td class="em_white" height="34" align="center" valign="middle" style="font-family: Arial, sans-serif; font-size: 13px; color:#ffffff; font-weight:bold; height:34px;"><a href=http://localhost:3000/carrito target="_blank" style="text-decoration:none; color:#ffffff; line-height:34px; display:block;">Comprar</a></td>
                              </tr>
                            </table>
                                </td>
                              </tr>
                            </table>
                            </td>
                          </tr>
                          <tr>
                            <td height="26" style="height:26px;" class="em_h20">&nbsp;</td>
                          </tr>
                        </table>
                    </td>
                  </tr>
    
                </table>
                </td>
              </tr>
              <tr>
                <td height="20" class="em_h10" bgcolor="#c3b9c6" style="height:20px; font-size:1px; line-height:1px; background-color:#015386;"></td>
              </tr>
              <tr>
                <td>
               
    
    <table width="100%" border="0" cellspacing="0" cellpadding="0" class="em_full_wrap" align="center" bgcolor="#ffffff" >
        <tr>
          <td align="center" valign="top">
              <table align="center" width="650" border="0" cellspacing="0" cellpadding="0" class="em_main_table" style="width:650px; table-layout:fixed; background-color:#015386;">
              <tr>
                <td align="center" valign="top"><table border="0" cellspacing="0" cellpadding="0" align="center">
                    <tr>
                      <td width="12" align="left" valign="middle" style="font-size:0px; line-height:0px; width:12px;"><a href="#" target="_blank" style="text-decoration:none;"></a></td>
                      <td width="7" style="width:7px; font-size:0px; line-height:0px;" class="em_w5">&nbsp;</td>
                  <td class="em_grey em_font_11" align="left" valign="middle" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 28px; color:#ffffff; font-weight:bold;""><a href="#" target="_blank" style="text-decoration:none; color:#171714;"></a>¡Siguenos en nuestras redes sociales!</td>
                <td align="center" valign="top" style="padding:0 25px;" class="em_aside10">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
                  <tr>
                    <td height="20" style="height:20px;" class="em_h20"></td>
                  </tr>
                  <tr>
                    <td align="rigth" valign="top">
                        <table border="0" cellspacing="0" cellpadding="0" align="rigth">
                        <tr>
                          <td width="30" style="width:30px;" align="rigth" valign="middle"><a href="http://twitter.com" target="_blank" style="text-decoration:none;"><img src="https://i.imgur.com/bZTF6DN.png" width="30" height="30" alt="Fb" border="0" style="display:block; font-family:Arial, sans-serif; font-size:18px; line-height:25px; text-align:center; color:#000000; font-weight:bold; max-width:30px;" /></a></td>
                          <td width="12" style="width:12px;">&nbsp;</td>
                          <td width="30" style="width:30px;" align="rigth" valign="middle"><a href="http://whatsapp.com" target="_blank" style="text-decoration:none;"><img src="https://i.imgur.com/Mm13dmd.png" width="30" height="30" alt="Wh" border="0" style="display:block; font-family:Arial, sans-serif; font-size:14px; line-height:25px; text-align:center; color:#000000; font-weight:bold; max-width:30px;" /></a></td>
                          <td width="12" style="width:12px;">&nbsp;</td>
                          <td width="30" style="width:30px;" align="rigth" valign="middle"><a href="https://www.instagram.com/nasdroviabeerstore/" target="_blank" style="text-decoration:none;"><img src="https://i.imgur.com/nqySgMj.png" width="30" height="30" alt="Wh" border="0" style="display:block; font-family:Arial, sans-serif; font-size:14px; line-height:25px; text-align:center; color:#000000; font-weight:bold; max-width:30px;" /></a></td>
                          <td width="12" style="width:12px;">&nbsp;</td>
                          <td width="30" style="width:30px;" align="rigth" valign="middle"><a href="https://www.facebook.com/nasdrovia.beerstore.9" style="text-decoration:none;"><img src="https://i.imgur.com/H7OZp6t.png" width="28" height="28" alt="Email" border="0" style="display:block; font-family:Arial, sans-serif; font-size:14px; line-height:25px; text-align:center; color:#000000; font-weight:bold; max-width:30px;" /></a></td>
                        </tr>
                      </table>
                     </td>
                  </tr>
                  <tr>
                    <td height="16" style="height:16px; font-size:1px; line-height:1px; height:16px;">&nbsp;</td>
                  </tr>
                               <tr>
                    <td height="10" style="height:10px; font-size:1px; line-height:1px;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td align="center" valign="top" style="font-size:0px; line-height:0px;"><table border="0" cellspacing="0" cellpadding="0" align="center">
                    <tr>
                    </tr>
                    </table>
                    </td>
                  </tr>
                    <tr>
                   
                      </tr>
                    </table>
                    </td>
                  </tr>
        
                  <tr>
                    <td height="16" style="font-size:0px; line-height:0px; height:16px;">&nbsp;</td>
                  </tr>
                </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
    </table>
    </body>
    </html>`
  };
  // console.log("esto es data", data);
  mg.messages().send(data, function (error, body) {
    if (error) {
      console.log({ error });
      return res.status(200).send({  statusEmail: "error" });
    }else{
      return res.status(200).send({ statusEmail: "Email enviado" });
    }
  });
})
module.exports = router;
