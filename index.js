import { Client, Users, Databases, Storage } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const users = new Users(client);
  const databases = new Databases(client);
  const storage = new Storage(client);

  const DATABASE_ID = process.env.DATABASE_ID;
  const COMMERCE_COLLECTION_ID = process.env.COMMERCE_COLLECTION_ID;
  const PRODUCTS_COLLECTION_ID = process.env.PRODUCTS_COLLECTION_ID;
   
  // Función para parsear el payload correctamente
  const parsePayload = (payload) => {
    try {
      // Si payload es string, parsearlo
      if (typeof payload === 'string') {
        return JSON.parse(payload);
      }
      // Si ya es objeto, devolverlo
      if (typeof payload === 'object') {
        return payload;
      }
      return {};
    } catch (err) {
      log(`Error parseando payload: ${err.message}`);
      return {};
    }
  };

  // Función para obtener el método HTTP y headers
  const getRequestInfo = () => {
    log(`=== INFORMACIÓN DE LA PETICIÓN ===`);
    log(`Método HTTP: ${req.method || 'No especificado'}`);
    log(`Headers: ${JSON.stringify(req.headers || {})}`);
    log(`Path: ${req.path || '/'}`);
    log(`Query params: ${JSON.stringify(req.query || {})}`);
    log(`================================`);
  };

  // ==================== MANEJADORES DE USUARIOS ====================
  
  const handleUsersList = async () => {
    log('📋 Obteniendo lista de usuarios...');
    const response = await users.list();
    log(`✅ Usuarios encontrados: ${response.users.length}`);
    return {
      success: true,
      data: response.users,
      total: response.total,
      message: 'Usuarios obtenidos exitosamente'
    };
  };

  const handleUsersGet = async (userId) => {
    if (!userId) {
      throw new Error('userId es requerido');
    }
    log(`🔍 Obteniendo usuario: ${userId}`);
    const user = await users.get(userId);
    log(`✅ Usuario encontrado: ${user.email}`);
    return {
      success: true,
      data: user,
      message: 'Usuario obtenido exitosamente'
    };
  };

  const handleUsersCreate = async (userData) => {
    const { email, phone, password, name, labels = [] } = userData;
    if (!email || !password) {
      throw new Error('email y password son requeridos');
    }
    log(`👤 Creando usuario: ${email}`);
    const user = await users.create( 
      email,
      phone,
      password,
      name
    );
    if (labels.length > 0) {
      await users.updateLabels(user.$id, labels);
    }
    log(`✅ Usuario creado: ${user.$id}`);
    return {
      success: true,
      data: user,
      message: 'Usuario creado exitosamente'
    };
  };

  const handleUsersUpdate = async (userId, updateData) => {
    if (!userId) {
      throw new Error('userId es requerido');
    }
    log(`✏️ Actualizando usuario: ${userId}`);
    log(`Datos a actualizar: ${JSON.stringify(updateData)}`);
    
    const user = await users.update(userId, updateData.name, updateData.email);
    
    if (updateData.labels) {
      await users.updateLabels(userId, updateData.labels);
    }
    
    if (updateData.status !== undefined) {
      await users.updateStatus(userId, updateData.status);
    }
    
    if (updateData.password) {
      await users.updatePassword(userId, updateData.password);
    }
    
    log(`✅ Usuario actualizado: ${userId}`);
    return {
      success: true,
      data: user,
      message: 'Usuario actualizado exitosamente'
    };
  };

  const handleUsersBlock = async (userId) => {
    if (!userId) {
      throw new Error('userId es requerido');
    }
    log(`🚫 Bloqueando usuario: ${userId}`);
    const user = await users.updateStatus(userId, false);
    log(`✅ Usuario ${userId} bloqueado`);
    return {
      success: true,
      data: user,
      message: 'Usuario bloqueado exitosamente'
    };
  };

  const handleUsersUnblock = async (userId) => {
    if (!userId) {
      throw new Error('userId es requerido');
    }
    log(`🔓 Desbloqueando usuario: ${userId}`);
    const user = await users.updateStatus(userId, true);
    log(`✅ Usuario ${userId} desbloqueado`);
    return {
      success: true,
      data: user,
      message: 'Usuario desbloqueado exitosamente'
    };
  };

  const handleUsersDelete = async (userId) => {
    if (!userId) {
      throw new Error('userId es requerido');
    }
    log(`🗑️ Eliminando usuario: ${userId}`);
    
    // Primero eliminar todos los comercios y productos del usuario
    log(`Buscando comercios del usuario...`);
    const commerces = await databases.getDocument(DATABASE_ID, COMMERCE_COLLECTION_ID, [
      `userId = "${userId}"`
    ]);
    
    if(commerces.length > 0) {
      for (const commerce of commerces.documents) {
      log(`Eliminando comercio: ${commerce.$id}`);
      // Eliminar productos del comercio
      const products = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
        `commerceId = "${commerce.$id}"`
      ]);
      for (const product of products.documents) {
        log(`Eliminando producto: ${product.$id}`);
        await databases.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, product.$id);
      }
      await databases.deleteDocument(DATABASE_ID, COMMERCE_COLLECTION_ID, commerce.$id);
    }
    }
    
    await users.delete(userId);
    log(`✅ Usuario ${userId} eliminado completamente`);
    return {
      success: true,
      message: 'Usuario y todos sus datos eliminados exitosamente'
    };
  };

  // ==================== MANEJADORES DE COMERCIOS ====================
  
  const handleCommerceList = async (filters = {}) => {
    log('📋 Obteniendo lista de comercios...');
    const queries = [];
    if (filters.userId) {
      queries.push(`userId = "${filters.userId}"`);
    }
    const response = await databases.listDocuments(DATABASE_ID, COMMERCE_COLLECTION_ID, queries);
    log(`✅ Comercios encontrados: ${response.documents.length}`);
    return {
      success: true,
      data: response.documents,
      total: response.total,
      message: 'Comercios obtenidos exitosamente'
    };
  };

  const handleCommerceGet = async (commerceId) => {
    if (!commerceId) {
      throw new Error('commerceId es requerido');
    }
    log(`🔍 Obteniendo comercio: ${commerceId}`);
    const commerce = await databases.getDocument(DATABASE_ID, COMMERCE_COLLECTION_ID, commerceId);
    log(`✅ Comercio encontrado: ${commerce.name}`);
    return {
      success: true,
      data: commerce,
      message: 'Comercio obtenido exitosamente'
    };
  };

  const handleCommerceCreate = async (commerceData) => {
    const { name, description, address, phone, category, userId, imageUrl } = commerceData;
    if (!name || !userId) {
      throw new Error('name y userId son requeridos');
    }
    log(`🏪 Creando comercio: ${name}`);
    const commerce = await databases.createDocument(
      DATABASE_ID,
      COMMERCE_COLLECTION_ID,
      'unique()',
      {
        name,
        description: description || '',
        address: address || '',
        phone: phone || '',
        category: category || '',
        userId,
        imageUrl: imageUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    log(`✅ Comercio creado: ${commerce.$id}`);
    return {
      success: true,
      data: commerce,
      message: 'Comercio creado exitosamente'
    };
  };

  const handleCommerceUpdate = async (commerceId, updateData) => {
    if (!commerceId) {
      throw new Error('commerceId es requerido');
    }
    log(`✏️ Actualizando comercio: ${commerceId}`);
    log(`Datos a actualizar: ${JSON.stringify(updateData)}`);
    
    updateData.updatedAt = new Date().toISOString();
    const commerce = await databases.updateDocument(
      DATABASE_ID,
      COMMERCE_COLLECTION_ID,
      commerceId,
      updateData
    );
    log(`✅ Comercio actualizado: ${commerceId}`);
    return {
      success: true,
      data: commerce,
      message: 'Comercio actualizado exitosamente'
    };
  };

  const handleCommerceDelete = async (commerceId) => {
    if (!commerceId) {
      throw new Error('commerceId es requerido');
    }
    log(`🗑️ Eliminando comercio: ${commerceId}`);
    
    // Eliminar todos los productos del comercio
    const products = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
      `commerceId = "${commerceId}"`
    ]);
    
    for (const product of products.documents) {
      log(`Eliminando producto: ${product.$id}`);
      await databases.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, product.$id);
    }
    
    await databases.deleteDocument(DATABASE_ID, COMMERCE_COLLECTION_ID, commerceId);
    log(`✅ Comercio ${commerceId} eliminado con sus productos`);
    return {
      success: true,
      message: 'Comercio y sus productos eliminados exitosamente'
    };
  };

  // ==================== MANEJADORES DE PRODUCTOS ====================
  
  const handleProductList = async (filters = {}) => {
    log('📋 Obteniendo lista de productos...');
    const queries = [];
    if (filters.commerceId) {
      queries.push(`commerceId = "${filters.commerceId}"`);
    }
    if (filters.userId) {
      queries.push(`userId = "${filters.userId}"`);
    }
    const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, queries);
    log(`✅ Productos encontrados: ${response.documents.length}`);
    return {
      success: true,
      data: response.documents,
      total: response.total,
      message: 'Productos obtenidos exitosamente'
    };
  };

  const handleProductGet = async (productId) => {
    if (!productId) {
      throw new Error('productId es requerido');
    }
    log(`🔍 Obteniendo producto: ${productId}`);
    const product = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, productId);
    log(`✅ Producto encontrado: ${product.name}`);
    return {
      success: true,
      data: product,
      message: 'Producto obtenido exitosamente'
    };
  };

  const handleProductCreate = async (productData) => {
    const { name, description, price, image, category, commerceId, userId } = productData;
    if (!name || !price || !commerceId || !userId) {
      throw new Error('name, price, commerceId y userId son requeridos');
    }
    log(`📦 Creando producto: ${name}`);
    const product = await databases.createDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      'unique()',
      {
        name,
        description: description || '',
        price: parseFloat(price),
        image: image || '',
        category: category || '',
        commerceId,
        userId,
        votes: 0,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    log(`✅ Producto creado: ${product.$id}`);
    return {
      success: true,
      data: product,
      message: 'Producto creado exitosamente'
    };
  };

  const handleProductUpdate = async (productId, updateData) => {
    if (!productId) {
      throw new Error('productId es requerido');
    }
    log(`✏️ Actualizando producto: ${productId}`);
    log(`Datos a actualizar: ${JSON.stringify(updateData)}`);
    
    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }
    updateData.updatedAt = new Date().toISOString();
    
    const product = await databases.updateDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      productId,
      updateData
    );
    log(`✅ Producto actualizado: ${productId}`);
    return {
      success: true,
      data: product,
      message: 'Producto actualizado exitosamente'
    };
  };

  const handleProductDelete = async (productId) => {
    if (!productId) {
      throw new Error('productId es requerido');
    }
    log(`🗑️ Eliminando producto: ${productId}`);
    await databases.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, productId);
    log(`✅ Producto ${productId} eliminado`);
    return {
      success: true,
      message: 'Producto eliminado exitosamente'
    };
  };

  const handleProductVote = async (productId, voteChange) => {
    if (!productId) {
      throw new Error('productId es requerido');
    }
    log(`👍 Actualizando votos del producto: ${productId}, cambio: ${voteChange}`);
    
    const product = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, productId);
    const newVotes = (product.votes || 0) + (voteChange || 0);
    
    const updated = await databases.updateDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      productId,
      { votes: newVotes }
    );
    log(`✅ Nuevo total de votos: ${newVotes}`);
    return {
      success: true,
      data: updated,
      message: 'Voto actualizado exitosamente'
    };
  };

  // ==================== MAIN FUNCTION ====================
  
  try {
    // Mostrar información de depuración
    getRequestInfo();
    
    // Parsear el payload de diferentes fuentes posibles
    let payload = {};
    
    // Intentar obtener payload de diferentes lugares
    if (req.payload) {
      payload = parsePayload(req.payload);
      log(`📦 Payload de req.payload: ${JSON.stringify(payload)}`);
    }
    
    if (req.body && Object.keys(payload).length === 0) {
      payload = parsePayload(req.body);
      log(`📦 Payload de req.body: ${JSON.stringify(payload)}`);
    }
    
    if (req.query && Object.keys(payload).length === 0) {
      payload = req.query;
      log(`📦 Payload de req.query: ${JSON.stringify(payload)}`);
    }
    
    // Obtener acción y datos de diferentes fuentes
    let action = payload.action || req.headers['x-action'] || req.query.action || '';
    let data = payload.data || payload;
    let target = payload.target || '';
    
    log(`🎯 Acción detectada: ${action}`);
    log(`🎯 Target detectado: ${target}`);
    log(`📊 Data recibida: ${JSON.stringify(data)}`);
    
    // Si no hay acción específica, intentar determinar por el path o método
    if (!action) {
      const path = req.path || '';
      if (path.includes('users')) action = 'users_list';
      else if (path.includes('commerces')) action = 'commerce_list';
      else if (path.includes('products')) action = 'product_list';
      else action = 'list'; // Acción por defecto
      log(`⚠️ Acción no especificada, usando: ${action}`);
    }
    
    // ==================== ROUTER PRINCIPAL ====================
    let result;
    
    switch (action) {
      // USUARIOS
      case 'users_list':
      case 'list_users':
      case 'list':
        result = await handleUsersList();
        break;
      
      case 'users_get':
      case 'get_user':
        result = await handleUsersGet(data.userId || data.id);
        break;
      
      case 'users_create':
      case 'create_user':
        result = await handleUsersCreate(data);
        break;
      
      case 'users_update':
      case 'update_user':
        result = await handleUsersUpdate(data.userId || data.id, data);
        break;
      
      case 'users_block':
      case 'block':
        result = await handleUsersBlock(data.userId || data.id);
        break;
      
      case 'users_unblock':
      case 'unblock':
        result = await handleUsersUnblock(data.userId || data.id);
        break;
      
      case 'users_delete':
      case 'delete':
        result = await handleUsersDelete(data.userId || data.id);
        break;
      
      // COMERCIOS
      case 'commerce_list':
      case 'list_commerces':
        result = await handleCommerceList(data);
        break;
      
      case 'commerce_get':
      case 'get_commerce':
        result = await handleCommerceGet(data.commerceId || data.id);
        break;
      
      case 'commerce_create':
      case 'create_commerce':
        result = await handleCommerceCreate(data);
        break;
      
      case 'commerce_update':
      case 'update_commerce':
        result = await handleCommerceUpdate(data.commerceId || data.id, data);
        break;
      
      case 'commerce_delete':
      case 'delete_commerce':
        result = await handleCommerceDelete(data.commerceId || data.id);
        break;
      
      // PRODUCTOS
      case 'product_list':
      case 'list_products':
        result = await handleProductList(data);
        break;
      
      case 'product_get':
      case 'get_product':
        result = await handleProductGet(data.productId || data.id);
        break;
      
      case 'product_create':
      case 'create_product':
        result = await handleProductCreate(data);
        break;
      
      case 'product_update':
      case 'update_product':
        result = await handleProductUpdate(data.productId || data.id, data);
        break;
      
      case 'product_delete':
      case 'delete_product':
        result = await handleProductDelete(data.productId || data.id);
        break;
      
      case 'product_vote':
      case 'vote':
        result = await handleProductVote(data.productId || data.id, data.voteChange);
        break;
      
      default:
        log(`❌ Acción no reconocida: ${action}`);
        return res.json({
          success: false,
          error: `Acción '${action}' no válida`,
          availableActions: [
            'users_list', 'users_get', 'users_create', 'users_update', 'users_block', 'users_unblock', 'users_delete',
            'commerce_list', 'commerce_get', 'commerce_create', 'commerce_update', 'commerce_delete',
            'product_list', 'product_get', 'product_create', 'product_update', 'product_delete', 'product_vote'
          ]
        }, 400);
    }
    
    // ==================== RESPUESTA FINAL ====================
    log(`✅ Operación completada exitosamente`);
    log(`📤 Enviando respuesta: ${JSON.stringify(result)}`);
    
    return res.json(result, 200);
    
  } catch (err) {
    error(`❌ ERROR EN LA FUNCIÓN: ${err}`);
    error(`MENSAJE ERROR: ${err.message}`);
    error(`Stack trace: ${err.stack}`);
    
    return res.json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, 500);
  }
};